-- Lets the admin hide a category from the storefront (boutique filter,
-- homepage category tiles) without deleting it or touching any product in
-- it — a product keeps its own `is_active` flag regardless. Renaming a
-- category needs no migration: `products.category` already references
-- `product_categories.name` with `on update cascade`
-- (20260921000005_product_categories_table.sql), so a plain UPDATE on the
-- name already propagates to every product in it automatically.
alter table public.product_categories
  add column is_visible boolean not null default true;
