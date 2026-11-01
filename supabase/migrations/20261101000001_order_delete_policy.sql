-- No DELETE policy existed on orders at all (only admin read/update) — the
-- admin UI's "delete order(s)" action would otherwise silently affect 0
-- rows under RLS. order_items/order_status_history cascade via their
-- existing ON DELETE CASCADE FK — foreign-key-driven cascade deletes are
-- not subject to RLS on the referencing table, so no DELETE policy is
-- needed there too. order_idempotency_keys.order_id has no FK (by design,
-- see 20261005000003) so a deleted order's idempotency row is left
-- orphaned — harmless, it's only ever looked up by its key, never by
-- order_id.
create policy "admin delete orders" on public.orders
  for delete using (public.is_admin());
