-- Cancelling an order previously just flipped its status — stock sold to
-- that order stayed decremented forever. This adds the reverse of
-- create_order's stock decrement: restock every line (variant stock if the
-- item had a size, flat product stock otherwise — mirroring create_order
-- exactly, including letting the product_variants_sync_stock trigger keep
-- products.stock in sync), roll "sold" back down, and log a matching
-- stock_movements entry, before marking the order Annulée. Idempotent: a
-- second cancel on an already-cancelled order is a no-op.
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_previous_stock integer;
  v_new_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable.';
  end if;
  if v_order.status = 'Annulée' then
    return;
  end if;

  for v_item in select * from public.order_items where order_id = p_order_id loop
    -- Product deleted since the order was placed: nothing left to restock.
    if v_item.product_id is null then
      continue;
    end if;

    if v_item.variant_id is not null then
      update public.product_variants set stock = stock + v_item.quantity
        where id = v_item.variant_id
        returning stock - v_item.quantity, stock into v_previous_stock, v_new_stock;
    else
      update public.products set stock = stock + v_item.quantity
        where id = v_item.product_id
        returning stock - v_item.quantity, stock into v_previous_stock, v_new_stock;
    end if;

    update public.products set sold = greatest(0, sold - v_item.quantity) where id = v_item.product_id;

    insert into public.stock_movements (product_id, product_name, previous_stock, new_stock, difference, reason, admin_id)
    values (
      v_item.product_id,
      v_item.name || case when v_item.variant_size is not null then ' — Taille ' || v_item.variant_size else '' end,
      v_previous_stock, v_new_stock, v_new_stock - v_previous_stock,
      'Annulation ' || v_order.order_number, auth.uid()
    );
  end loop;

  update public.orders set status = 'Annulée' where id = p_order_id;
end;
$$;

revoke execute on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;
