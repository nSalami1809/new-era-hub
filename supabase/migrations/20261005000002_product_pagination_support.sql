-- Support for server-side pagination (ID-2): denormalized/generated columns
-- so the boutique and admin list screens can filter/sort/paginate entirely
-- in the query, instead of fetching the full table and filtering in JS.

-- Denormalized, trigger-maintained list of distinct sizes a product has a
-- variant for — same reasoning and pattern as products.stock being kept in
-- sync from product_variants by the existing product_variants_sync_stock
-- trigger (20260920000015_product_variants.sql). Lets the boutique's size
-- filter be a plain column condition (`available_sizes @> array[...]`)
-- instead of a relational EXISTS/inner-join that would also restrict which
-- variants come back embedded on each product.
alter table public.products
  add column available_sizes text[] not null default '{}';

-- size is nullable (color-only variants, 20260921000007_product_colors.sql)
-- — excluded here and in the trigger below, or a color-only variant would
-- show up as a size literally named "null".
update public.products p
set available_sizes = coalesce((
  select array_agg(distinct v.size order by v.size)
  from public.product_variants v
  where v.product_id = p.id and v.size is not null
), '{}');

create or replace function public.sync_product_available_sizes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
  set available_sizes = coalesce((
    select array_agg(distinct size order by size)
    from public.product_variants
    where product_id = v_product_id and size is not null
  ), '{}')
  where id = v_product_id;
  return null;
end;
$$;

create trigger product_variants_sync_available_sizes
  after insert or update of size or delete on public.product_variants
  for each row execute function public.sync_product_available_sizes();

-- Generated (not trigger-maintained) because they're a pure, deterministic
-- function of two existing columns on the SAME row — Postgres recomputes
-- them atomically on every insert/update, so there's no drift risk the way
-- a trigger-maintained column could in principle have. Exactly reproduces
-- the existing client-side effectivePrice()/promo logic (src/lib/types.ts),
-- so server-side sort/filter results match today's behavior precisely
-- instead of approximating it.
alter table public.products
  add column effective_price numeric(12,2) generated always as (
    case
      when promotional_price is not null and promotional_price < price then promotional_price
      else price
    end
  ) stored,
  add column has_promo boolean generated always as (
    promotional_price is not null and promotional_price < price
  ) stored;

-- Default sort for the paginated boutique/admin product lists; products had
-- no index on created_at before (unlike orders, which already does).
create index products_created_at_idx on public.products (created_at desc);

-- Anon doesn't inherit SELECT on a new column automatically (see
-- 20261004000002_product_track_by_size.sql) — authenticated (admin) keeps
-- its full-table grant from 20260920000010_product_cost_price.sql.
grant select (available_sizes, effective_price, has_promo) on public.products to anon;

-- Same reasoning as effective_price: the admin orders list search currently
-- matches "firstName lastName" as one combined string client-side, which no
-- single column can reproduce server-side via OR'd ilike conditions on
-- customer_first_name / customer_last_name separately. A generated column
-- keeps that exact behavior. orders has no per-column anon grant (it's never
-- read directly by anon — only via the RPCs), so authenticated's existing
-- full-table grant already covers it.
alter table public.orders
  add column customer_full_name text generated always as (
    customer_first_name || ' ' || customer_last_name
  ) stored;
