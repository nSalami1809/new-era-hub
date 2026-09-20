create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  previous_stock integer not null,
  new_stock integer not null,
  difference integer not null,
  reason text not null,
  admin_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_product_id_idx on public.stock_movements (product_id);
create index stock_movements_created_at_idx on public.stock_movements (created_at desc);
