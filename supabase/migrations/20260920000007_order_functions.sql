-- Server-side order creation: the ONLY way an order can be created. The
-- client sends a cart (product_id + quantity) and customer info — never a
-- price or a total. Stock and price are re-read from the products table
-- inside this function, under row locks, so nothing the browser sends can
-- be trusted or tampered with.
create or replace function public.create_order(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_delivery_location text,
  p_address text,
  p_note text,
  p_items jsonb -- [{ "product_id": "uuid", "quantity": 2 }, ...]
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_effective_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
  v_new_stock integer;
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

  -- Lock every product row up front, in a stable order, so two concurrent
  -- checkouts on overlapping carts can't both pass the stock check.
  for v_item in select * from jsonb_array_elements(p_items) order by (value->>'product_id')
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

    if v_product.stock < v_quantity then
      raise exception 'Stock insuffisant pour % : il ne reste que % exemplaire(s).', v_product.name, v_product.stock;
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

    v_effective_price := case
      when v_product.promotional_price is not null and v_product.promotional_price < v_product.price
      then v_product.promotional_price
      else v_product.price
    end;

    insert into public.order_items (order_id, product_id, name, brand, sku, image, unit_price, base_price, quantity)
    values (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
      v_product.images[1], v_effective_price, v_product.price, v_quantity
    );

    v_subtotal := v_subtotal + v_product.price * v_quantity;
    v_discount := v_discount + (v_product.price - v_effective_price) * v_quantity;
    v_new_stock := v_product.stock - v_quantity;

    update public.products set stock = v_new_stock, sold = sold + v_quantity where id = v_product.id;

    insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
    values (v_product.id, v_product.name, v_product.stock, v_new_stock, v_new_stock - v_product.stock, 'Commande ' || v_order_number, null);
  end loop;

  update public.orders set subtotal = v_subtotal, discount = v_discount, total = v_subtotal - v_discount
    where id = v_order_id;

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.create_order(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, text, text, text, jsonb) to anon, authenticated;

-- Guest receipt lookup: returns exactly one order by its (unguessable) uuid
-- or by its order number, bypassing the admin-only RLS on `orders` /
-- `order_items` on purpose. Safe because it only ever returns the single
-- order matching the reference the caller already has (from the redirect
-- right after checkout, or their WhatsApp receipt) — it is never listable.
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
        'quantity', oi.quantity
      )), '[]'::jsonb)
      from public.order_items oi where oi.order_id = o.id
    )
  )
  from public.orders o
  where o.id::text = p_ref or o.order_number = p_ref
  limit 1;
$$;

revoke execute on function public.get_order_receipt(text) from public;
grant execute on function public.get_order_receipt(text) to anon, authenticated;

-- Admin stock adjustment: updates the product and logs the movement
-- atomically. Runs as the caller (not security definer) — the explicit
-- is_admin() check gives a clean error instead of relying on RLS to
-- silently no-op the update for a non-admin.
create or replace function public.adjust_stock(p_product_id uuid, p_new_stock integer, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_previous integer;
  v_name text;
  v_clamped integer := greatest(0, p_new_stock);
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
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

revoke execute on function public.adjust_stock(uuid, integer, text) from public;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;
