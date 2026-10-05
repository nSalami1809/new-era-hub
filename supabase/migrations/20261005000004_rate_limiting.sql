-- Rate limiting for the 4 publicly-callable RPCs (create_order,
-- get_order_receipt, get_order_receipt_by_number, preview_promo_code) —
-- identified by auditing has_function_privilege('anon', ...) across every
-- function in public; every other anon-grantable function is either a
-- trigger (uncallable directly), gated by an internal is_admin() check, or
-- harmless (is_admin() itself). Pure Postgres, no Redis/pg_cron/external
-- service: a fixed-window counter table, incremented by a single atomic
-- INSERT ... ON CONFLICT DO UPDATE (same native-serialization mechanism as
-- order_idempotency_keys in 20261005000003 — no application-level lock).
create table public.rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0,
  primary key (bucket_key, window_start)
);

-- Supports the cleanup DELETE's range scan by window_start alone — the
-- primary key's composite index (bucket_key, window_start) doesn't serve
-- that query shape.
create index rate_limit_hits_window_start_idx on public.rate_limit_hits (window_start);

alter table public.rate_limit_hits enable row level security;
-- No policies, no anon/authenticated grants: only check_rate_limit
-- (security definer) ever touches this table — same lock-it-down pattern
-- as order_idempotency_keys.

-- Shared by all 4 rate-limited RPCs. p_bucket_prefix scopes the limit per
-- RPC (so exhausting create_order's budget doesn't affect
-- get_order_receipt's), identified per caller by IP — the only identifier
-- available for an anonymous storefront visitor. cf-connecting-ip is set by
-- Cloudflare at the edge and can't be spoofed by the client (verified for
-- real against this project: it's present and correct on every request);
-- x-forwarded-for is a fallback for a path that doesn't go through
-- Cloudflare. No IP found -> fail OPEN (skip limiting) rather than grouping
-- every such caller under one shared bucket, which could collectively lock
-- out unrelated legitimate callers on that fallback path.
create or replace function public.check_rate_limit(
  p_bucket_prefix text, p_limit integer, p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers jsonb;
  v_ip text;
  v_bucket_key text;
  v_window_start timestamptz;
  v_count integer;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  v_ip := coalesce(
    nullif(v_headers ->> 'cf-connecting-ip', ''),
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), '')
  );

  if v_ip is null then
    return;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_bucket_key := p_bucket_prefix || ':' || v_ip;

  insert into public.rate_limit_hits (bucket_key, window_start, hit_count)
  values (v_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set hit_count = rate_limit_hits.hit_count + 1
  returning hit_count into v_count;

  -- Probabilistic cleanup instead of pg_cron: bounds table growth without a
  -- scheduled job or new dependency. Cheap and safe to run inline — worst
  -- case it's a no-op scan on an empty range.
  if random() < 0.01 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 hour';
  end if;

  if v_count > p_limit then
    raise exception 'Trop de tentatives, réessayez dans quelques minutes.' using errcode = 'P0429';
  end if;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- create_order: 5 / 10 min. Checked first (before any validation) so a
-- scripted flood of even malformed requests is throttled too, not just
-- well-formed ones.
create or replace function public.create_order(
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

  select coalesce(jsonb_agg(elem order by elem->>'product_id', coalesce(elem->>'variant_id', ''), (elem->>'quantity')::int), '[]'::jsonb)
    into v_canonical_items
    from jsonb_array_elements(p_items) elem;

  v_fingerprint := encode(extensions.digest(
    (
      coalesce(trim(p_first_name), '') || '|' || coalesce(trim(p_last_name), '') || '|' ||
      coalesce(trim(p_phone), '') || '|' || coalesce(trim(p_delivery_location), '') || '|' ||
      coalesce(trim(p_address), '') || '|' || coalesce(trim(p_note), '') || '|' ||
      coalesce(upper(trim(p_promo_code)), '') || '|' || v_canonical_items::text
    )::bytea,
    'sha256'
  ), 'hex');

  -- Checked BEFORE the rate limit: a replay of an already-completed attempt
  -- (lost response after a real commit — the scenario order_idempotency_keys
  -- exists for) must never cost a rate-limit slot. Without this, a user on
  -- a bad connection who legitimately retries the same submission several
  -- times could get locked out of ever seeing their own already-created
  -- order's confirmation — the opposite of the intended protection.
  select k.fingerprint, k.order_id, k.order_number, k.access_token
    into v_existing_fingerprint, v_order_id, v_order_number, v_access_token
    from public.order_idempotency_keys k
    where k.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'Cette requête a déjà été utilisée pour une commande différente.';
    end if;
    return query select v_order_id, v_order_number, v_access_token;
    return;
  end if;

  -- Only a genuinely new attempt (no existing match above) reaches here.
  perform public.check_rate_limit('create_order', 5, 600);

  begin
    insert into public.order_idempotency_keys (idempotency_key, fingerprint)
    values (p_idempotency_key, v_fingerprint);
  exception when unique_violation then
    -- Lost the race to a truly concurrent call with the same key (both
    -- passed the SELECT above before either committed) — same handling as
    -- before: the winner's row is guaranteed complete by the time Postgres
    -- unblocks this insert.
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

-- get_order_receipt: 20 / 10 min. Was STABLE — no longer accurate now that
-- it writes a rate-limit counter as a side effect, so the marker is
-- dropped (defaults to VOLATILE). A STABLE function that performs writes is
-- an incorrect declaration regardless of whether Postgres happens to allow
-- it in this exact call path — some poolers/replicas route STABLE calls
-- differently, so this is a correctness fix, not just cosmetic.
create or replace function public.get_order_receipt(p_ref text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.check_rate_limit('get_order_receipt', 20, 600);
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

-- get_order_receipt_by_number: 10 / 10 min. This is DEFENSE IN DEPTH on top
-- of (not a replacement for) the ID-1 protection: the real fix for the
-- order_number-enumeration PII leak was removing order_number from
-- get_order_receipt's matching entirely (20261005000001) and requiring the
-- checkout phone here too. This rate limit only makes a brute-force sweep
-- of order_number x phone combinations slow enough to be useless on top of
-- that — it does not by itself make enumeration safe.
create or replace function public.get_order_receipt_by_number(p_order_number text, p_phone text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.check_rate_limit('get_order_receipt_by_number', 10, 600);
  select jsonb_build_object('access_token', o.access_token)
  from public.orders o
  where o.order_number = trim(p_order_number)
    and regexp_replace(o.customer_phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
$$;

-- preview_promo_code: 15 / 10 min.
create or replace function public.preview_promo_code(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
  v_discount numeric(12,2);
begin
  perform public.check_rate_limit('preview_promo_code', 15, 600);

  select * into v_promo from public.promo_codes where upper(code) = upper(trim(coalesce(p_code, '')));
  if not found or not v_promo.is_active then
    return jsonb_build_object('valid', false, 'message', 'Code promo invalide.');
  end if;
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return jsonb_build_object('valid', false, 'message', 'Ce code promo a expiré.');
  end if;
  if v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses then
    return jsonb_build_object('valid', false, 'message', 'Ce code promo a atteint sa limite d''utilisation.');
  end if;
  if v_promo.min_order_total is not null and p_subtotal < v_promo.min_order_total then
    return jsonb_build_object(
      'valid', false,
      'message', 'Montant minimum requis : ' || v_promo.min_order_total || '.'
    );
  end if;

  v_discount := case
    when v_promo.discount_type = 'percent' then round(p_subtotal * v_promo.discount_value / 100, 2)
    else v_promo.discount_value
  end;
  v_discount := least(v_discount, p_subtotal);

  return jsonb_build_object('valid', true, 'discount', v_discount, 'code', v_promo.code);
end;
$$;

-- CREATE OR REPLACE doesn't change parameter types here (only volatility /
-- internal body), so grants are untouched by the replace — restated
-- explicitly anyway for certainty on a replayed/fresh database.
revoke execute on function public.create_order(text, text, text, text, text, text, jsonb, text, text) from public;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb, text, text) to anon, authenticated;
revoke execute on function public.get_order_receipt(text) from public;
grant execute on function public.get_order_receipt(text) to anon, authenticated;
revoke execute on function public.get_order_receipt_by_number(text, text) from public;
grant execute on function public.get_order_receipt_by_number(text, text) to anon, authenticated;
revoke execute on function public.preview_promo_code(text, numeric) from public;
grant execute on function public.preview_promo_code(text, numeric) to anon, authenticated;

-- Hygiene: dangling EXECUTE grants on trigger functions (uncallable
-- directly, but no reason to leave the grant dangling) found during this
-- audit.
revoke execute on function public.log_order_status() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_product_available_sizes() from public, anon, authenticated;
revoke execute on function public.sync_product_stock_from_variants() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
