-- Moyen de paiement et reference de transaction pour une vente hors site
-- (ex. "Mobile Money" + le code donne par l'operateur) : deux colonnes
-- generiques sur `orders` (meme pattern que proof_image_url), facultatives,
-- que l'UI n'expose que pour channel = 'offline'. Doivent aussi apparaitre
-- sur la facture (get_order_receipt) puisque c'est ce document que l'admin
-- telecharge et envoie au client.
alter table public.orders add column payment_method text;
alter table public.orders add column transaction_reference text;

create or replace function public.get_order_receipt(p_ref text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'customer_first_name', o.customer_first_name,
    'customer_last_name', o.customer_last_name,
    'customer_phone', o.customer_phone,
    'delivery_location', o.delivery_location,
    'customer_address', o.customer_address,
    'customer_note', o.customer_note,
    'payment_method', o.payment_method,
    'transaction_reference', o.transaction_reference,
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
