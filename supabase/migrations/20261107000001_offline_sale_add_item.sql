-- Permet d'ajouter un article a une vente hors site DEJA enregistree (le
-- client revient prendre un deuxieme article, ou l'admin avait oublie une
-- ligne) sans creer une seconde commande separee. Reprend exactement la
-- logique d'un item de create_offline_sale (verrouillage, verif stock,
-- sold, stock_movements) mais sur une commande existante : incremente son
-- subtotal/total au lieu d'initialiser une nouvelle commande.
create or replace function public.add_offline_sale_item(
  p_order_id uuid,
  p_product_id uuid,
  p_variant_id uuid default null,
  p_quantity integer default 1,
  p_unit_price numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_variant_color_name text;
  v_size_kind text;
  v_available integer;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_new_stock integer;
  v_previous_stock integer;
  v_item_label text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantité invalide.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if v_order.channel <> 'offline' then
    raise exception 'Seules les ventes hors site peuvent être complétées ainsi.';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Produit introuvable.';
  end if;

  if p_variant_id is not null then
    select * into v_variant from public.product_variants
      where id = p_variant_id and product_id = v_product.id
      for update;
    if not found then
      raise exception 'Variante introuvable.';
    end if;
    v_available := v_variant.stock;
  else
    v_available := v_product.stock;
  end if;

  if v_available < p_quantity then
    raise exception 'Stock insuffisant pour % : il ne reste que % exemplaire(s).', v_product.name, v_available;
  end if;

  v_variant_color_name := null;
  v_size_kind := null;
  if p_variant_id is not null then
    if v_variant.color_id is not null then
      select name into v_variant_color_name from public.product_colors where id = v_variant.color_id;
    end if;
    if v_variant.size is not null then
      select nullif(size_type, 'none') into v_size_kind
        from public.product_categories where name = v_product.category;
    end if;
  end if;

  v_unit_price := p_unit_price;
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

  v_line_total := v_unit_price * p_quantity;

  insert into public.order_items (
    order_id, product_id, name, brand, sku, image, unit_price, base_price, cost_price, quantity,
    variant_id, variant_size, variant_color, variant_size_kind
  )
  values (
    p_order_id, v_product.id, v_product.name, v_product.brand, v_product.sku,
    v_product.images[1], v_unit_price, v_product.price, v_product.cost_price, p_quantity,
    p_variant_id, case when p_variant_id is not null then v_variant.size else null end,
    v_variant_color_name, v_size_kind
  );

  if p_variant_id is not null then
    v_previous_stock := v_variant.stock;
    v_new_stock := v_variant.stock - p_quantity;
    update public.product_variants set stock = v_new_stock where id = p_variant_id;
  else
    v_previous_stock := v_product.stock;
    v_new_stock := v_product.stock - p_quantity;
    update public.products set stock = v_new_stock where id = v_product.id;
  end if;
  update public.products set sold = sold + p_quantity where id = v_product.id;

  v_item_label := v_product.name
    || case when v_variant_color_name is not null then ' — ' || v_variant_color_name else '' end
    || case when p_variant_id is not null and v_variant.size is not null then ' — Taille ' || v_variant.size else '' end;

  insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
  values (
    v_product.id, v_item_label,
    v_previous_stock, v_new_stock, v_new_stock - v_previous_stock,
    'Ajout d''article a la vente hors site ' || v_order.order_number, auth.uid()
  );

  update public.orders set subtotal = subtotal + v_line_total, total = total + v_line_total
    where id = p_order_id;
end;
$$;

revoke execute on function public.add_offline_sale_item(uuid, uuid, uuid, integer, numeric) from public;
grant execute on function public.add_offline_sale_item(uuid, uuid, uuid, integer, numeric) to authenticated;
