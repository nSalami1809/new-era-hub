-- Colors, Shein-style: each color of a product carries its own photo set
-- (clicking a color swatch swaps the displayed images) and, combined with an
-- optional size, its own stock row in product_variants. A product can use
-- sizes only (unchanged from before), colors only, both, or neither.
create table public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  hex_color text,
  images text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create index product_colors_product_id_idx on public.product_colors (product_id);

alter table public.product_colors enable row level security;

create policy "public read colors of visible products" on public.product_colors
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_colors.product_id and (p.is_active or public.is_admin())
    )
  );

create policy "admin write colors" on public.product_colors
  for all using (public.is_admin()) with check (public.is_admin());

-- product_variants: a row can now carry a color (new optional FK) in
-- addition to, or instead of, a size (now optional too) — at least one of
-- the two must be set, otherwise the row would be indistinguishable from
-- "no variant".
alter table public.product_variants
  add column color_id uuid references public.product_colors (id) on delete cascade;

alter table public.product_variants alter column size drop not null;

alter table public.product_variants drop constraint product_variants_size_check;
alter table public.product_variants add constraint product_variants_size_check
  check (size is null or char_length(trim(size)) >= 1);

alter table public.product_variants add constraint product_variants_size_or_color_check
  check (size is not null or color_id is not null);

-- Coalesce so two NULLs (e.g. two colorless size variants, or two sizeless
-- color variants) still collide as duplicates — a plain multi-column unique
-- constraint would let NULLs past silently since NULL <> NULL there.
alter table public.product_variants drop constraint product_variants_product_id_size_key;
create unique index product_variants_product_size_color_idx on public.product_variants (
  product_id,
  coalesce(size, ''),
  coalesce(color_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- add_product_variant gains an optional color; the signature changes so drop
-- the old 3-arg version explicitly first (same pattern as create_order's
-- promo-code parameter in 20260921000001).
drop function if exists public.add_product_variant(uuid, text, integer);

create or replace function public.add_product_variant(
  p_product_id uuid, p_size text, p_color_id uuid, p_initial_stock integer
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_variant_id uuid;
  v_product_name text;
  v_color_name text;
  v_clamped integer := greatest(0, coalesce(p_initial_stock, 0));
  v_size text := nullif(trim(coalesce(p_size, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;
  if v_size is null and p_color_id is null then
    raise exception 'Taille ou couleur requise.';
  end if;

  select name into v_product_name from public.products where id = p_product_id;
  if not found then
    raise exception 'Produit introuvable.';
  end if;

  if p_color_id is not null then
    select name into v_color_name from public.product_colors
      where id = p_color_id and product_id = p_product_id;
    if not found then
      raise exception 'Couleur introuvable.';
    end if;
  end if;

  insert into public.product_variants (product_id, size, color_id, stock)
  values (p_product_id, v_size, p_color_id, v_clamped)
  returning id into v_variant_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (
    p_product_id,
    v_product_name
      || case when v_color_name is not null then ' — ' || v_color_name else '' end
      || case when v_size is not null then ' — Taille ' || v_size else '' end,
    0, v_clamped, v_clamped, 'Ajout de variante', auth.uid()
  );

  return v_variant_id;
end;
$$;

revoke execute on function public.add_product_variant(uuid, text, uuid, integer) from public;
grant execute on function public.add_product_variant(uuid, text, uuid, integer) to authenticated;

-- remove_product_variant / adjust_variant_stock keep their signature, just
-- gain a color-aware audit label.
create or replace function public.remove_product_variant(p_variant_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_product_id uuid;
  v_product_name text;
  v_size text;
  v_color_id uuid;
  v_color_name text;
  v_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select product_id, size, color_id, stock into v_product_id, v_size, v_color_id, v_stock
    from public.product_variants where id = p_variant_id;
  if not found then
    raise exception 'Variante introuvable.';
  end if;

  select name into v_product_name from public.products where id = v_product_id;
  if v_color_id is not null then
    select name into v_color_name from public.product_colors where id = v_color_id;
  end if;

  delete from public.product_variants where id = p_variant_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (
    v_product_id,
    v_product_name
      || case when v_color_name is not null then ' — ' || v_color_name else '' end
      || case when v_size is not null then ' — Taille ' || v_size else '' end,
    v_stock, 0, -v_stock, 'Variante supprimée', auth.uid()
  );
end;
$$;

create or replace function public.adjust_variant_stock(p_variant_id uuid, p_new_stock integer, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_previous integer;
  v_product_id uuid;
  v_product_name text;
  v_size text;
  v_color_id uuid;
  v_color_name text;
  v_clamped integer := greatest(0, p_new_stock);
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select stock, product_id, size, color_id into v_previous, v_product_id, v_size, v_color_id
    from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'Variante introuvable.';
  end if;

  select name into v_product_name from public.products where id = v_product_id;
  if v_color_id is not null then
    select name into v_color_name from public.product_colors where id = v_color_id;
  end if;

  update public.product_variants set stock = v_clamped where id = p_variant_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (
    v_product_id,
    v_product_name
      || case when v_color_name is not null then ' — ' || v_color_name else '' end
      || case when v_size is not null then ' — Taille ' || v_size else '' end,
    v_previous, v_clamped, v_clamped - v_previous, p_reason, auth.uid()
  );
end;
$$;

-- Admin-only color management, mirroring the variant functions above.
create or replace function public.add_product_color(
  p_product_id uuid, p_name text, p_hex_color text, p_images text[], p_sort_order integer default 0
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_color_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Nom de couleur requis.';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produit introuvable.';
  end if;

  insert into public.product_colors (product_id, name, hex_color, images, sort_order)
  values (
    p_product_id, trim(p_name), nullif(trim(coalesce(p_hex_color, '')), ''),
    coalesce(p_images, '{}'), coalesce(p_sort_order, 0)
  )
  returning id into v_color_id;

  return v_color_id;
end;
$$;

revoke execute on function public.add_product_color(uuid, text, text, text[], integer) from public;
grant execute on function public.add_product_color(uuid, text, text, text[], integer) to authenticated;

create or replace function public.update_product_color(
  p_color_id uuid, p_name text, p_hex_color text, p_images text[]
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Nom de couleur requis.';
  end if;

  update public.product_colors
  set name = trim(p_name),
      hex_color = nullif(trim(coalesce(p_hex_color, '')), ''),
      images = coalesce(p_images, images)
  where id = p_color_id;

  if not found then
    raise exception 'Couleur introuvable.';
  end if;
end;
$$;

revoke execute on function public.update_product_color(uuid, text, text, text[]) from public;
grant execute on function public.update_product_color(uuid, text, text, text[]) to authenticated;

-- Removing a color cascades to its variants (FK on delete cascade, which
-- fires product_variants_sync_stock per row exactly like a manual delete
-- would) — the total stock lost is logged first so the audit trail doesn't
-- just lose it silently.
create or replace function public.remove_product_color(p_color_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_product_id uuid;
  v_product_name text;
  v_color_name text;
  v_total_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select product_id, name into v_product_id, v_color_name
    from public.product_colors where id = p_color_id;
  if not found then
    raise exception 'Couleur introuvable.';
  end if;

  select name into v_product_name from public.products where id = v_product_id;
  select coalesce(sum(stock), 0) into v_total_stock
    from public.product_variants where color_id = p_color_id;

  delete from public.product_colors where id = p_color_id;

  if v_total_stock > 0 then
    insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
    values (
      v_product_id, v_product_name || ' — ' || v_color_name,
      v_total_stock, 0, -v_total_stock, 'Couleur supprimée', auth.uid()
    );
  end if;
end;
$$;

revoke execute on function public.remove_product_color(uuid) from public;
grant execute on function public.remove_product_color(uuid) to authenticated;

-- Order items snapshot which color was bought too (mirrors the existing
-- variant_size snapshot — stays correct even if the color is later renamed
-- or removed).
alter table public.order_items add column variant_color text;

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

  -- Lock every product (and variant, if any) row up front, in a stable
  -- order, so two concurrent checkouts on overlapping carts can't both pass
  -- the stock check.
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
    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id = v_variant_id;
      if v_variant.color_id is not null then
        select name into v_variant_color_name from public.product_colors where id = v_variant.color_id;
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
      variant_id, variant_size, variant_color
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
      v_product.images[1], v_effective_price, v_product.price, v_product.cost_price, v_quantity,
      v_variant_id, case when v_variant_id is not null then v_variant.size else null end,
      v_variant_color_name
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

-- Guest receipt now also returns which color was bought.
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
