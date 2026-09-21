-- Categories now declare what kind of size their products use ('shoes' →
-- "Pointure", 'clothing' → "Taille", 'none' → no size at all). This lets the
-- admin product form show the right preset sizes automatically instead of
-- the admin having to type free-text sizes and figure out the wording
-- themselves — and lets a category that doesn't need sizes (caps, bags,
-- cosmetics...) skip the whole size UI entirely.
alter table public.product_categories
  add column size_type text not null default 'none'
  check (size_type in ('none', 'clothing', 'shoes'));

update public.product_categories set size_type = 'shoes' where name = 'Chaussures';
update public.product_categories set size_type = 'clothing' where name = 'Vêtements';

create or replace function public.set_category_size_type(p_category_id uuid, p_size_type text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;
  if p_size_type not in ('none', 'clothing', 'shoes') then
    raise exception 'Type de taille invalide.';
  end if;
  update public.product_categories set size_type = p_size_type where id = p_category_id;
  if not found then
    raise exception 'Catégorie introuvable.';
  end if;
end;
$$;

revoke execute on function public.set_category_size_type(uuid, text) from public;
grant execute on function public.set_category_size_type(uuid, text) to authenticated;

-- Order items snapshot which size wording applied at purchase time — like
-- every other order_items column (name/brand/price/variant_size/...) — so
-- an old invoice or WhatsApp message still says "Pointure 42" correctly
-- even if the product's category is later renamed or reclassified.
alter table public.order_items add column variant_size_kind text;

drop function if exists public.create_order(text, text, text, text, text, text, jsonb, text);

create or replace function public.create_order(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_delivery_location text,
  p_address text,
  p_note text,
  p_items jsonb, -- [{ "product_id": "uuid", "variant_id": "uuid"|null, "quantity": 2 }, ...]
  p_promo_code text default null
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_variant_color_name text;
  v_size_kind text;
  v_variant_id uuid;
  v_quantity integer;
  v_available integer;
  v_unit_price numeric(12,2);
  v_effective_price numeric(12,2);
  v_line_total numeric(12,2);
  v_bundles integer;
  v_remainder integer;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
  v_new_stock integer;
  v_previous_stock integer;
  v_promo public.promo_codes%rowtype;
  v_promo_discount numeric(12,2);
  v_applied_promo_code text;
  v_item_label text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Votre panier est vide.';
  end if;
  if trim(coalesce(p_first_name, '')) = '' or trim(coalesce(p_last_name, '')) = '' then
    raise exception 'Nom et prénom requis.';
  end if;
  if trim(coalesce(p_delivery_location, '')) = '' then
    raise exception 'Lieu de livraison requis.';
  end if;

  for v_item in
    select * from jsonb_array_elements(p_items)
    order by (value->>'product_id'), coalesce(value->>'variant_id', '')
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantité invalide.';
    end if;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

    if not found or not v_product.is_active then
      raise exception 'Un produit de votre panier n''est plus disponible.';
    end if;

    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    if v_variant_id is not null then
      select * into v_variant from public.product_variants
        where id = v_variant_id and product_id = v_product.id
        for update;
      if not found then
        raise exception 'Une variante de votre panier n''est plus disponible.';
      end if;
      v_available := v_variant.stock;
    else
      v_available := v_product.stock;
    end if;

    if v_available < v_quantity then
      raise exception 'Stock insuffisant pour % : il ne reste que % exemplaire(s).', v_product.name, v_available;
    end if;
  end loop;

  select count(*) into v_count from public.orders o where o.order_number like 'CMD-' || v_year || '-%';
  v_order_number := 'CMD-' || v_year || '-' || lpad((v_count + 1)::text, 4, '0');

  insert into public.orders (
    order_number, customer_first_name, customer_last_name, customer_phone,
    delivery_location, customer_address, customer_note, subtotal, discount, total
  ) values (
    v_order_number, trim(p_first_name), trim(p_last_name), trim(p_phone),
    trim(p_delivery_location), nullif(trim(coalesce(p_address, '')), ''), nullif(trim(coalesce(p_note, '')), ''),
    0, 0, 0
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid;

    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_variant_color_name := null;
    v_size_kind := null;
    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id = v_variant_id;
      if v_variant.color_id is not null then
        select name into v_variant_color_name from public.product_colors where id = v_variant.color_id;
      end if;
      if v_variant.size is not null then
        select nullif(size_type, 'none') into v_size_kind
          from public.product_categories where name = v_product.category;
      end if;
    end if;

    v_unit_price := case
      when v_product.promotional_price is not null and v_product.promotional_price < v_product.price
      then v_product.promotional_price
      else v_product.price
    end;

    -- Multi-buy bundle: full bundles at the bundle price, any remainder at
    -- the normal/promotional unit price (unaffected by which size/color was
    -- picked — bundles are priced per product).
    if v_product.bundle_active and v_product.bundle_quantity is not null and v_product.bundle_price is not null
       and v_quantity >= v_product.bundle_quantity then
      v_bundles := v_quantity / v_product.bundle_quantity;
      v_remainder := v_quantity % v_product.bundle_quantity;
      v_line_total := v_bundles * v_product.bundle_price + v_remainder * v_unit_price;
      v_effective_price := v_line_total / v_quantity;
    else
      v_effective_price := v_unit_price;
    end if;

    insert into public.order_items (
      order_id, product_id, name, brand, sku, image, unit_price, base_price, cost_price, quantity,
      variant_id, variant_size, variant_color, variant_size_kind
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
      v_product.images[1], v_effective_price, v_product.price, v_product.cost_price, v_quantity,
      v_variant_id, case when v_variant_id is not null then v_variant.size else null end,
      v_variant_color_name, v_size_kind
    );

    v_subtotal := v_subtotal + v_product.price * v_quantity;
    v_discount := v_discount + (v_product.price - v_effective_price) * v_quantity;

    if v_variant_id is not null then
      v_previous_stock := v_variant.stock;
      v_new_stock := v_variant.stock - v_quantity;
      update public.product_variants set stock = v_new_stock where id = v_variant_id;
      -- products.stock is kept in sync by the product_variants_sync_stock trigger.
    else
      v_previous_stock := v_product.stock;
      v_new_stock := v_product.stock - v_quantity;
      update public.products set stock = v_new_stock where id = v_product.id;
    end if;
    update public.products set sold = sold + v_quantity where id = v_product.id;

    v_item_label := v_product.name
      || case when v_variant_color_name is not null then ' — ' || v_variant_color_name else '' end
      || case when v_variant_id is not null and v_variant.size is not null then ' — Taille ' || v_variant.size else '' end;

    insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
    values (
      v_product.id, v_item_label,
      v_previous_stock, v_new_stock, v_new_stock - v_previous_stock,
      'Commande ' || v_order_number, null
    );
  end loop;

  -- Coupon: re-validated and consumed against the running total (after
  -- product/bundle discounts), row-locked to make the redemption atomic.
  if p_promo_code is not null and trim(p_promo_code) <> '' then
    select * into v_promo from public.promo_codes
      where upper(code) = upper(trim(p_promo_code))
      for update;

    if found and v_promo.is_active
       and (v_promo.expires_at is null or v_promo.expires_at >= now())
       and (v_promo.max_uses is null or v_promo.used_count < v_promo.max_uses)
       and (v_promo.min_order_total is null or (v_subtotal - v_discount) >= v_promo.min_order_total)
    then
      v_promo_discount := case
        when v_promo.discount_type = 'percent' then round((v_subtotal - v_discount) * v_promo.discount_value / 100, 2)
        else v_promo.discount_value
      end;
      v_promo_discount := least(v_promo_discount, v_subtotal - v_discount);

      v_discount := v_discount + v_promo_discount;
      v_applied_promo_code := v_promo.code;
      update public.promo_codes set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  update public.orders
    set subtotal = v_subtotal, discount = v_discount, total = v_subtotal - v_discount,
        promo_code = v_applied_promo_code
    where id = v_order_id;

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.create_order(text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- Guest receipt now also returns the size wording kind.
create or replace function public.get_order_receipt(p_ref text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'customer_first_name', o.customer_first_name,
    'customer_last_name', o.customer_last_name,
    'customer_phone', o.customer_phone,
    'delivery_location', o.delivery_location,
    'customer_address', o.customer_address,
    'customer_note', o.customer_note,
    'subtotal', o.subtotal,
    'discount', o.discount,
    'total', o.total,
    'promo_code', o.promo_code,
    'status', o.status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'order_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id,
        'name', oi.name,
        'brand', oi.brand,
        'sku', oi.sku,
        'image', oi.image,
        'unit_price', oi.unit_price,
        'base_price', oi.base_price,
        'variant_size', oi.variant_size,
        'variant_color', oi.variant_color,
        'variant_size_kind', oi.variant_size_kind,
        'quantity', oi.quantity
      )), '[]'::jsonb)
      from public.order_items oi where oi.order_id = o.id
    ),
    'order_status_history', (
      select coalesce(jsonb_agg(jsonb_build_object('status', h.status, 'at', h.at) order by h.at), '[]'::jsonb)
      from public.order_status_history h where h.order_id = o.id
    )
  )
  from public.orders o
  where o.id::text = p_ref or o.order_number = p_ref
  limit 1;
$$;

revoke execute on function public.get_order_receipt(text) from public;
grant execute on function public.get_order_receipt(text) to anon, authenticated;
