-- The guest invoice should also show which coupon (if any) was applied.
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
    'promo_code', o.promo_code,
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
