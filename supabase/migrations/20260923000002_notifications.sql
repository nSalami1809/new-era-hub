-- In-app admin notifications: new-order alerts (via Realtime) and a
-- configurable low-margin threshold (%) surfaced on the Comptabilité page
-- and the admin header bell. No external service — everything stays inside
-- Supabase (Postgres + the Realtime replication already built into it).

alter table public.store_settings
  add column low_margin_threshold numeric(5,2) not null default 15
    check (low_margin_threshold >= 0 and low_margin_threshold <= 100);

-- Lets an authenticated admin session subscribe to INSERTs on `orders` via
-- supabase.channel(...).on('postgres_changes', ...). Realtime still honors
-- the existing RLS policy ("admin read orders"), so a non-admin session
-- subscribing to the same table sees nothing.
alter publication supabase_realtime add table public.orders;
