-- Broadens the catalog beyond caps: every product now belongs to one of a
-- fixed set of categories. Existing rows default to 'Casquettes' so nothing
-- currently in the catalog is left uncategorized.
create type public.product_category as enum (
  'Casquettes',
  'Vêtements',
  'Chaussures',
  'Accessoires'
);

alter table public.products
  add column category public.product_category not null default 'Casquettes';

create index products_category_idx on public.products (category);
