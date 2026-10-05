-- Idempotency for create_order: a double-click, a client-side retry, or a
-- response lost after commit must never create two orders. The mapping of
-- "which attempt" to "which order" lives in its own table rather than a
-- column on orders — it needs its own unique constraint and gets written
-- (claimed) BEFORE the heavier stock-locking work, independent of whether
-- that work later succeeds.
create table public.order_idempotency_keys (
  idempotency_key text primary key,
  -- SHA-256 of the normalized request params, computed server-side from the
  -- actual bound parameters (not a client-supplied hash) — a replay of the
  -- exact same logical request always produces the same fingerprint
  -- regardless of client-side JSON key ordering.
  fingerprint text not null,
  order_id uuid,
  order_number text,
  access_token text,
  created_at timestamptz not null default now()
);

alter table public.order_idempotency_keys enable row level security;
-- No policies, no anon/authenticated grants: only create_order (security
-- definer, bypasses RLS and column grants) ever touches this table — same
-- lock-it-down-entirely pattern as every other internal-only table here.

-- create_order now requires an idempotency key (its one caller, the
-- checkout form, is updated in the same change to always send one — making
-- it optional would leave the protection silently off whenever a caller
-- forgets to pass it, defeating the point).
--
-- Adding a parameter changes the function's type signature, so CREATE OR
-- REPLACE would not replace the 8-arg version below — it would create a
-- second, overloaded create_order alongside it, leaving PostgREST with two
-- candidates for the same RPC name. The old signature is renamed out of the
-- way first (same approach as create_order_deprecated_v1 in
-- 20261005000001_order_access_token.sql — avoids a DROP FUNCTION).
alter function public.create_order(text, text, text, text, text, text, jsonb, text)
  rename to create_order_deprecated_v2;
revoke all on function public.create_order_deprecated_v2(text, text, text, text, text, text, jsonb, text)
  from anon, authenticated, public;

create function public.create_order(
  p_first_name text, p_last_name text, p_phone text, p_delivery_location text,
  p_address text, p_note text, p_items jsonb, p_promo_code text default null,
  p_idempotency_key text default null
)
returns table(order_id uuid, order_number text, access_token text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
-- order_id/order_number/access_token are both OUT parameters (from
-- RETURNS TABLE) and real column names on orders/order_idempotency_keys —
-- without this, bare references to them in RETURNING/UPDATE SET/SELECT are
-- ambiguous. This was a latent bug since 20261005000001 added access_token
-- to RETURNS TABLE (the insert's `returning id, access_token` was never
-- actually exercised by a successful order in testing until now — every
-- prior test stopped at an earlier validation error).
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
  v_fingerprint text;
  v_existing_fingerprint text;
  v_canonical_items jsonb;
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
  if trim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Clé d''idempotence requise.';
  end if;

  -- Canonical (order-independent) form of the cart, so the fingerprint is
  -- stable even if two calls happened to serialize the same items in a
  -- different array order.
  select coalesce(jsonb_agg(elem order by elem->>'product_id', coalesce(elem->>'variant_id', ''), (elem->>'quantity')::int), '[]'::jsonb)
    into v_canonical_items
    from jsonb_array_elements(p_items) elem;

  -- pgcrypto's digest() lives in the "extensions" schema (Supabase default),
  -- which `set search_path = public` above deliberately excludes —
  -- schema-qualify it explicitly rather than widening the search path.
  -- encode() is a core pg_catalog function, always in scope, left as-is.
  v_fingerprint := encode(extensions.digest(
    (
      coalesce(trim(p_first_name), '') || '|' || coalesce(trim(p_last_name), '') || '|' ||
      coalesce(trim(p_phone), '') || '|' || coalesce(trim(p_delivery_location), '') || '|' ||
      coalesce(trim(p_address), '') || '|' || coalesce(trim(p_note), '') || '|' ||
      coalesce(upper(trim(p_promo_code)), '') || '|' || v_canonical_items::text
    )::bytea,
    'sha256'
  ), 'hex');

  begin
    insert into public.order_idempotency_keys (idempotency_key, fingerprint)
    values (p_idempotency_key, v_fingerprint);
  exception when unique_violation then
    -- A concurrent/earlier call already committed under this key — Postgres
    -- blocks our insert until that transaction finishes, so by the time we
    -- get here the existing row is guaranteed to hold its final state.
    -- Table alias required: order_id/order_number/access_token are also the
    -- function's OUT parameter names (implicit plpgsql variables from
    -- `returns table(...)`), so the bare column names are ambiguous.
    select k.fingerprint, k.order_id, k.order_number, k.access_token
      into v_existing_fingerprint, v_order_id, v_order_number, v_access_token
      from public.order_idempotency_keys k
      where k.idempotency_key = p_idempotency_key;

    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'Cette requête a déjà été utilisée pour une commande différente.';
    end if;

    return query select v_order_id, v_order_number, v_access_token;
    return;
  end;

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

  update public.order_idempotency_keys
    set order_id = v_order_id, order_number = v_order_number, access_token = v_access_token
    where idempotency_key = p_idempotency_key;

  return query select v_order_id, v_order_number, v_access_token;
end;
$$;

revoke execute on function public.create_order(text, text, text, text, text, text, jsonb, text, text) from public;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb, text, text) to anon, authenticated;
