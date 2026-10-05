-- Fixes a PII leak: get_order_receipt used to also match on order_number
-- ('CMD-2026-0001', strictly sequential, meant to be typed/remembered) with
-- no ownership check — anyone could enumerate every order ever placed
-- (name, phone, delivery address, contents) just by incrementing the
-- suffix. access_token is a dedicated, unguessable (128-bit) public secret,
-- deliberately separate from `id` (internal primary key) and order_number
-- (human-facing reference, never a secret).
alter table public.orders
  add column access_token text not null unique
    default encode(gen_random_bytes(16), 'hex');

-- order_number removed from the matching entirely — that was the actual
-- enumeration vector (sequential, 'CMD-2026-0001'). `id` is kept alongside
-- access_token: it's a random v4 UUID, not sequential/guessable, so this is
-- not a new exposure — it only keeps already-shared invoice links working.
-- Parameter stays named p_ref (not renamed to p_token): Postgres rejects
-- renaming an input parameter via CREATE OR REPLACE, which would otherwise
-- require a DROP FUNCTION first. Keeping the name avoids that entirely.
create or replace function public.get_order_receipt(p_ref text)
returns jsonb
language sql
stable
security definer
set search_path = public
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
        'product_id', oi.product_id, 'name', oi.name, 'brand', oi.brand,
        'sku', oi.sku, 'image', oi.image, 'unit_price', oi.unit_price,
        'base_price', oi.base_price, 'variant_size', oi.variant_size,
        'variant_color', oi.variant_color, 'variant_size_kind', oi.variant_size_kind,
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
  where o.access_token = p_ref or o.id::text = p_ref
  limit 1;
$$;

-- Dedicated to the "Suivre ma commande" form, where a human types the
-- short order number from memory — a bearer token can't fill that role.
-- Requires order_number AND the checkout phone together; the response is
-- identical (empty) whether the number doesn't exist or the phone doesn't
-- match, so this can never be used to confirm a guessed order number.
create or replace function public.get_order_receipt_by_number(p_order_number text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('access_token', o.access_token)
  from public.orders o
  where o.order_number = trim(p_order_number)
    and regexp_replace(o.customer_phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
$$;

revoke execute on function public.get_order_receipt_by_number(text, text) from public;
grant execute on function public.get_order_receipt_by_number(text, text) to anon, authenticated;

-- create_order now also returns the new access_token (already populated by
-- the column default above) so the client can navigate straight to the
-- invoice without a second round trip. Logic is otherwise byte-for-byte
-- identical to the previous version. Postgres rejects CREATE OR REPLACE
-- when the RETURNS TABLE column list changes — it would require a
-- DROP FUNCTION first, so the old signature is renamed out of the way
-- instead (same end state, no DROP statement).
alter function public.create_order(text, text, text, text, text, text, jsonb, text)
  rename to create_order_deprecated_v1;
revoke all on function public.create_order_deprecated_v1(text, text, text, text, text, text, jsonb, text)
  from anon, authenticated, public;

create function public.create_order(
  p_first_name text, p_last_name text, p_phone text, p_delivery_location text,
  p_address text, p_note text, p_items jsonb, p_promo_code text default null
)
returns table(order_id uuid, order_number text, access_token text)
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
  v_access_token text;
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
  ) returning id, access_token into v_order_id, v_access_token;

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

  return query select v_order_id, v_order_number, v_access_token;
end;
$$;

-- CREATE OR REPLACE preserves existing grants when only appending a new
-- output column, but restate explicitly so this migration is correct even
-- replayed against a fresh database.
revoke execute on function public.create_order(text, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb, text) to anon, authenticated;
