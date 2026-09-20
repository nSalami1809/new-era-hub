-- "Buy N for a fixed price" promotions (e.g. "2 for 13 000 instead of
-- 14 000"), independent of and stackable with the existing flat
-- promotional_price. Config is kept even while inactive so the admin can
-- toggle it back on without retyping the numbers.
alter table public.products
  add column bundle_quantity integer check (bundle_quantity is null or bundle_quantity >= 2),
  add column bundle_price numeric(12,2) check (bundle_price is null or bundle_price > 0),
  add column bundle_active boolean not null default false,
  add constraint bundle_needs_config
    check (not bundle_active or (bundle_quantity is not null and bundle_price is not null)),
  add constraint bundle_price_is_a_discount
    check (bundle_price is null or bundle_quantity is null or bundle_price < bundle_quantity * price);

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

    v_unit_price := case
      when v_product.promotional_price is not null and v_product.promotional_price < v_product.price
      then v_product.promotional_price
      else v_product.price
    end;

    -- Multi-buy bundle: full bundles at the bundle price, any remainder at
    -- the normal/promotional unit price. unit_price stored on the line item
    -- ends up as the blended per-unit average, so subtotal/discount below
    -- (unchanged logic) stay correct whether or not a bundle applied.
    if v_product.bundle_active and v_product.bundle_quantity is not null and v_product.bundle_price is not null
       and v_quantity >= v_product.bundle_quantity then
      v_bundles := v_quantity / v_product.bundle_quantity;
      v_remainder := v_quantity % v_product.bundle_quantity;
      v_line_total := v_bundles * v_product.bundle_price + v_remainder * v_unit_price;
      v_effective_price := v_line_total / v_quantity;
    else
      v_effective_price := v_unit_price;
    end if;

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

-- Bundle fields are promotional and public by nature (the storefront must
-- display and price them) — unlike cost_price, add them to the anon grant.
revoke select on public.products from anon;
grant select (
  id, name, brand, category, description, price, promotional_price, stock,
  low_stock_threshold, sold, sku, images, is_active, is_featured, created_at, updated_at,
  bundle_quantity, bundle_price, bundle_active
) on public.products to anon;
