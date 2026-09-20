-- Purchase cost, for profit/margin reporting. Business-sensitive: never
-- exposed to the public storefront (see the column-privilege revoke below).
alter table public.products
  add column cost_price numeric(12,2) not null default 0 check (cost_price >= 0);

-- Snapshot of the product's cost at the time of sale, so historical profit
-- stays accurate even if the product's cost_price changes later — the same
-- reasoning that already gives order_items its own base_price/unit_price.
alter table public.order_items
  add column cost_price numeric(12,2) not null default 0 check (cost_price >= 0);

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

    insert into public.order_items (order_id, product_id, name, brand, sku, image, unit_price, base_price, cost_price, quantity)
    values (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
      v_product.images[1], v_effective_price, v_product.price, v_product.cost_price, v_quantity
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

-- Column-level security: the storefront reads `products` as `anon` via
-- "public read active products" (a row filter, not a column one) — without
-- this, cost_price would be visible to anyone via the public API. Revoke the
-- table-wide select grant and re-grant only the columns the storefront needs;
-- `authenticated` (admin-only in this app — there is no customer signup)
-- keeps its full-table grant untouched, so the admin panel still sees
-- cost_price via the same is_admin()-gated policy.
revoke select on public.products from anon;
grant select (
  id, name, brand, category, description, price, promotional_price, stock,
  low_stock_threshold, sold, sku, images, is_active, is_featured, created_at, updated_at
) on public.products to anon;
