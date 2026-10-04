-- Off-site sales (WhatsApp, in person...): lets the admin record a sale that
-- happened outside the site's own checkout, without touching the normal
-- create_order() path. Reuses `orders`/`order_items` on purpose — every
-- existing report (Comptabilité, dashboard, product.sold, stock_movements)
-- already reads from there, so an offline sale shows up everywhere for free.
alter table public.orders
  add column channel text not null default 'site' check (channel in ('site', 'offline'));

create index orders_channel_idx on public.orders (channel);

-- Mirrors create_order()'s locking/stock/sold/stock_movements logic, with
-- three deliberate differences: admin-only (not callable by anon/guest),
-- no customer/promo-code fields (placeholder customer text instead — this
-- was never a web checkout), and a per-line unit_price the admin can
-- override (an off-site sale may have been negotiated at a different price
-- than the site's current listing). Status is set straight to 'Payée' since
-- the money already changed hands elsewhere — there is no payment step here.
create or replace function public.create_offline_sale(
  p_items jsonb,
  p_note text default null
)
returns table(order_id uuid, order_number text)
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
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
  v_new_stock integer;
  v_previous_stock integer;
  v_item_label text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Aucun article.';
  end if;

  -- Pass 1: lock every row up front, in a deterministic order, and validate
  -- stock before writing anything — same discipline as create_order's first
  -- loop, to avoid deadlocking against a concurrent checkout/admin action.
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
    if not found then
      raise exception 'Produit introuvable.';
    end if;

    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    if v_variant_id is not null then
      select * into v_variant from public.product_variants
        where id = v_variant_id and product_id = v_product.id
        for update;
      if not found then
        raise exception 'Variante introuvable.';
      end if;
      v_available := v_variant.stock;
    else
      v_available := v_product.stock;
    end if;

    if v_available < v_quantity then
      raise exception 'Stock insuffisant pour % : il ne reste que % exemplaire(s).', v_product.name, v_available;
    end if;
  end loop;

  select count(*) into v_count from public.orders o where o.order_number like 'HS-' || v_year || '-%';
  v_order_number := 'HS-' || v_year || '-' || lpad((v_count + 1)::text, 4, '0');

  insert into public.orders (
    order_number, customer_first_name, customer_last_name, customer_phone,
    delivery_location, customer_note, subtotal, discount, total, status, channel
  ) values (
    v_order_number, 'Vente', 'hors site', '—',
    'Vente hors site', nullif(trim(coalesce(p_note, '')), ''), 0, 0, 0, 'Payée', 'offline'
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

    -- Admin-entered price if provided (a negotiated off-site price); else
    -- fall back to the product's current effective (promo-aware) price.
    v_unit_price := nullif(v_item->>'unit_price', '')::numeric(12,2);
    if v_unit_price is null then
      v_unit_price := case
        when v_product.promotional_price is not null and v_product.promotional_price < v_product.price
        then v_product.promotional_price
        else v_product.price
      end;
    end if;
    if v_unit_price < 0 then
      raise exception 'Prix invalide.';
    end if;

    v_line_total := v_unit_price * v_quantity;

    insert into public.order_items (
      order_id, product_id, name, brand, sku, image, unit_price, base_price, cost_price, quantity,
      variant_id, variant_size, variant_color, variant_size_kind
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
      v_product.images[1], v_unit_price, v_product.price, v_product.cost_price, v_quantity,
      v_variant_id, case when v_variant_id is not null then v_variant.size else null end,
      v_variant_color_name, v_size_kind
    );

    v_subtotal := v_subtotal + v_line_total;

    -- Same stock-write pattern as create_order: variants update only the
    -- variant row (a trigger syncs the parent product's aggregate stock);
    -- sizeless products update products.stock directly either way.
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
      'Vente hors site ' || v_order_number, auth.uid()
    );
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;

  return query select v_order_id, v_order_number;
end;
$$;

revoke execute on function public.create_offline_sale(jsonb, text) from public;
grant execute on function public.create_offline_sale(jsonb, text) to authenticated;
