-- Size variants (per-product, optional): a product with no rows here behaves
-- exactly as before (flat products.stock, edited via adjust_stock). A
-- product that has variant rows gets its products.stock kept in sync as the
-- SUM of its variants' stock (see the trigger below) — every other read of
-- products.stock (stockStatus, dashboard KPIs, cart availability checks...)
-- keeps working unmodified because the aggregate is always accurate.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null check (char_length(trim(size)) >= 1),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, size)
);

create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;

create policy "public read variants of visible products" on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and (p.is_active or public.is_admin())
    )
  );

create policy "admin write variants" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- Keeps products.stock == sum(variant stock) any time a variant is added,
-- adjusted, or removed, so nothing outside this file has to know variants
-- exist at all.
create or replace function public.sync_product_stock_from_variants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
  set stock = (select coalesce(sum(stock), 0) from public.product_variants where product_id = v_product_id)
  where id = v_product_id;
  return null;
end;
$$;

create trigger product_variants_sync_stock
  after insert or update of stock or delete on public.product_variants
  for each row execute function public.sync_product_stock_from_variants();

-- Once a product has variants, its flat stock must never be edited directly
-- (that would drift from the sum and silently desync) — force the caller to
-- use adjust_variant_stock instead.
create or replace function public.adjust_stock(p_product_id uuid, p_new_stock integer, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_previous integer;
  v_name text;
  v_clamped integer := greatest(0, p_new_stock);
  v_has_variants boolean;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select exists(select 1 from public.product_variants where product_id = p_product_id) into v_has_variants;
  if v_has_variants then
    raise exception 'Ce produit a des tailles : ajustez le stock par taille.';
  end if;

  select stock, name into v_previous, v_name from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Produit introuvable.';
  end if;

  update public.products set stock = v_clamped where id = p_product_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (p_product_id, v_name, v_previous, v_clamped, v_clamped - v_previous, p_reason, auth.uid());
end;
$$;

-- Admin-only variant management, each audited in stock_movements exactly
-- like adjust_stock already is for simple products.
create or replace function public.add_product_variant(p_product_id uuid, p_size text, p_initial_stock integer)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_variant_id uuid;
  v_product_name text;
  v_clamped integer := greatest(0, coalesce(p_initial_stock, 0));
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;
  if trim(coalesce(p_size, '')) = '' then
    raise exception 'Taille requise.';
  end if;

  select name into v_product_name from public.products where id = p_product_id;
  if not found then
    raise exception 'Produit introuvable.';
  end if;

  insert into public.product_variants (product_id, size, stock)
  values (p_product_id, trim(p_size), v_clamped)
  returning id into v_variant_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (p_product_id, v_product_name || ' — Taille ' || trim(p_size), 0, v_clamped, v_clamped, 'Ajout de la taille', auth.uid());

  return v_variant_id;
end;
$$;

create or replace function public.remove_product_variant(p_variant_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_product_id uuid;
  v_product_name text;
  v_size text;
  v_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select product_id, size, stock into v_product_id, v_size, v_stock
    from public.product_variants where id = p_variant_id;
  if not found then
    raise exception 'Taille introuvable.';
  end if;

  select name into v_product_name from public.products where id = v_product_id;

  delete from public.product_variants where id = p_variant_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (v_product_id, v_product_name || ' — Taille ' || v_size, v_stock, 0, -v_stock, 'Taille supprimée', auth.uid());
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
  v_clamped integer := greatest(0, p_new_stock);
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select stock, product_id, size into v_previous, v_product_id, v_size
    from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'Taille introuvable.';
  end if;

  select name into v_product_name from public.products where id = v_product_id;

  update public.product_variants set stock = v_clamped where id = p_variant_id;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (v_product_id, v_product_name || ' — Taille ' || v_size, v_previous, v_clamped, v_clamped - v_previous, p_reason, auth.uid());
end;
$$;

revoke execute on function public.add_product_variant(uuid, text, integer) from public;
grant execute on function public.add_product_variant(uuid, text, integer) to authenticated;
revoke execute on function public.remove_product_variant(uuid) from public;
grant execute on function public.remove_product_variant(uuid) to authenticated;
revoke execute on function public.adjust_variant_stock(uuid, integer, text) from public;
grant execute on function public.adjust_variant_stock(uuid, integer, text) to authenticated;

-- Order items snapshot which size was bought, same reasoning as the
-- existing name/brand/sku/price snapshots (stays correct even if the size
-- is later renamed or removed).
alter table public.order_items
  add column variant_id uuid references public.product_variants (id) on delete set null,
  add column variant_size text;

create or replace function public.create_order(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_delivery_location text,
  p_address text,
  p_note text,
  p_items jsonb -- [{ "product_id": "uuid", "variant_id": "uuid"|null, "quantity": 2 }, ...]
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
        raise exception 'Une taille de votre panier n''est plus disponible.';
      end if;
      v_available := v_variant.stock;
    else
      v_available := v_product.stock;
    end if;

    if v_available < v_quantity then
      raise exception 'Stock insuffisant pour % : il ne reste que % exemplaire(s).', v_product.name, v_available;
    end if;
  end loop;

  select count(*) into v_count from public.orders where order_number like 'CMD-' || v_year || '-%';
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
    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id = v_variant_id;
    end if;

    v_unit_price := case
      when v_product.promotional_price is not null and v_product.promotional_price < v_product.price
      then v_product.promotional_price
      else v_product.price
    end;

    -- Multi-buy bundle: full bundles at the bundle price, any remainder at
    -- the normal/promotional unit price (unaffected by which size was
    -- picked — bundles are priced per product, not per size).
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
      variant_id, variant_size
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
      v_product.images[1], v_effective_price, v_product.price, v_product.cost_price, v_quantity,
      v_variant_id, case when v_variant_id is not null then v_variant.size else null end
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

    insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
    values (
      v_product.id,
      v_product.name || case when v_variant_id is not null then ' — Taille ' || v_variant.size else '' end,
      v_previous_stock, v_new_stock, v_new_stock - v_previous_stock,
      'Commande ' || v_order_number, null
    );
  end loop;

  update public.orders set subtotal = v_subtotal, discount = v_discount, total = v_subtotal - v_discount
    where id = v_order_id;

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.create_order(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb) to anon, authenticated;

-- Guest receipt now also returns which size was bought.
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
    'status', o.status,
    'created_at', o.created_at,
    'customer', jsonb_build_object(
      'first_name', o.customer_first_name,
      'last_name', o.customer_last_name,
      'phone', o.customer_phone,
      'delivery_location', o.delivery_location,
      'address', o.customer_address,
      'note', o.customer_note
    ),
    'subtotal', o.subtotal,
    'discount', o.discount,
    'total', o.total,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id,
        'name', oi.name,
        'brand', oi.brand,
        'sku', oi.sku,
        'image', oi.image,
        'unit_price', oi.unit_price,
        'base_price', oi.base_price,
        'quantity', oi.quantity,
        'variant_size', oi.variant_size
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
