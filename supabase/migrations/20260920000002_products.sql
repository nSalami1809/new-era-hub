create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  brand text not null check (char_length(trim(brand)) >= 1),
  description text not null default '',
  price numeric(12,2) not null check (price > 0),
  promotional_price numeric(12,2) check (promotional_price is null or promotional_price > 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  sold integer not null default 0 check (sold >= 0),
  sku text not null unique check (char_length(trim(sku)) >= 2),
  images text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotional_price_below_price
    check (promotional_price is null or promotional_price < price),
  constraint at_least_one_image check (array_length(images, 1) >= 1)
);

create index products_is_active_idx on public.products (is_active);
create index products_brand_idx on public.products (brand);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
