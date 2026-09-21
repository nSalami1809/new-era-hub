-- Categories move from a fixed Postgres enum to an admin-manageable table,
-- so the admin can add new categories from the UI instead of needing a new
-- migration every time. Existing enum values are seeded as rows 1:1, and
-- products.category becomes a plain text column referencing this table by
-- name (on update cascade, so renaming a category updates every product;
-- on delete restrict, so a category in use can't be deleted out from under
-- its products).
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) >= 1),
  created_at timestamptz not null default now()
);

insert into public.product_categories (name)
select unnest(enum_range(null::public.product_category))::text;

alter table public.product_categories enable row level security;

create policy "public read categories" on public.product_categories
  for select using (true);

create policy "admin write categories" on public.product_categories
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.products alter column category drop default;
alter table public.products alter column category type text using category::text;
alter table public.products
  add constraint products_category_fkey foreign key (category)
  references public.product_categories (name) on update cascade on delete restrict;
alter table public.products alter column category set default 'Casquettes';

drop type public.product_category;
