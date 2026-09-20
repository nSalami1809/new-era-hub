create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_first_name text not null check (char_length(trim(customer_first_name)) >= 2),
  customer_last_name text not null check (char_length(trim(customer_last_name)) >= 2),
  customer_phone text not null,
  delivery_location text not null check (char_length(trim(delivery_location)) >= 2),
  customer_address text,
  customer_note text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  status public.order_status not null default 'Nouvelle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  brand text not null,
  sku text not null,
  image text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  base_price numeric(12,2) not null check (base_price >= 0),
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  at timestamptz not null default now()
);

create index order_status_history_order_id_idx on public.order_status_history (order_id);

-- Automatically trace every status the order goes through (creation + updates)
-- so the app never has to remember to write this itself. security definer:
-- an admin's direct UPDATE on orders.status runs as their own role, which has
-- no INSERT policy on order_status_history (deliberately — only this trigger
-- writes to it), so the insert must run with elevated privileges.
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger orders_log_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status();

create trigger orders_log_status_update
  after update on public.orders
  for each row execute function public.log_order_status();
