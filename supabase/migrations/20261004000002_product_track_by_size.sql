-- Per-product override of the category's size tracking: a clothing/shoes
-- category normally requires a size for every stock entry (ColorCard renders
-- the size grid), but some products in that category don't need that
-- granularity — a plain T-shirt sold by color only, for instance. Setting
-- this to false makes the admin form treat the product exactly like a
-- sizeType "none" category for that one product (one stock number per
-- color, via the existing color-only variant mechanism) without touching
-- the category itself or any other product in it.
alter table public.products
  add column track_by_size boolean not null default true;

-- Anon doesn't inherit SELECT on a new column automatically — every other
-- storefront-safe column was explicitly granted to anon back in
-- 20260920000002_products.sql (only cost_price was deliberately left out).
-- Without this, the storefront's single `select(PUBLIC_PRODUCT_COLUMNS)`
-- fails outright for guests the moment this column is added to that list,
-- not just a missing field in the response.
grant select (track_by_size) on public.products to anon;
