-- "Notify me when back in stock": anyone can leave a phone number against an
-- out-of-stock product (no auth — same trust model as checkout). The admin
-- reads the list from the Stocks page and reaches out over WhatsApp once
-- restocked, then dismisses (deletes) the request — there is no automated
-- notification pipeline, this is a manual follow-up list by design.
create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  phone text not null check (char_length(trim(phone)) >= 8),
  created_at timestamptz not null default now()
);

create index stock_alerts_product_id_idx on public.stock_alerts (product_id);

alter table public.stock_alerts enable row level security;

create policy "public request stock alert" on public.stock_alerts
  for insert with check (true);

create policy "admin read stock alerts" on public.stock_alerts
  for select using (public.is_admin());

create policy "admin delete stock alerts" on public.stock_alerts
  for delete using (public.is_admin());
