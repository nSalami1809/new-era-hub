-- Admin roles: a user is an admin iff a row exists here for their auth.users id.
-- No client (anon or authenticated) can insert/update/delete this table — the
-- first admin is granted manually via the Supabase SQL editor after they sign
-- up (see supabase/README.md).
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- security definer + fixed search_path: avoids RLS recursion when policies
-- below call this function, and avoids search_path hijacking.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.stock_movements enable row level security;
alter table public.user_roles enable row level security;

-- products: everyone sees active products; admins see and manage everything.
create policy "public read active products" on public.products
  for select using (is_active = true or public.is_admin());

create policy "admin write products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- store_settings: public read (needed for storefront branding/WhatsApp number),
-- admin-only write.
create policy "public read store settings" on public.store_settings
  for select using (true);

create policy "admin write store settings" on public.store_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- orders / order_items / order_status_history / stock_movements: admin-only.
-- Guests never query these tables directly — order creation and guest receipt
-- lookup go through the security-definer functions in the next migration,
-- which bypass RLS deliberately and only ever return the single order asked for.
create policy "admin read orders" on public.orders
  for select using (public.is_admin());

create policy "admin update orders" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admin read order items" on public.order_items
  for select using (public.is_admin());

create policy "admin read order status history" on public.order_status_history
  for select using (public.is_admin());

create policy "admin read stock movements" on public.stock_movements
  for select using (public.is_admin());

create policy "admin write stock movements" on public.stock_movements
  for insert with check (public.is_admin());

-- user_roles: a user may see their own membership row; nobody can write via
-- the client (no insert/update/delete policy is defined on purpose).
create policy "read own role" on public.user_roles
  for select using (user_id = auth.uid());
