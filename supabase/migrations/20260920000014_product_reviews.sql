-- Customer reviews, moderated: anyone can submit one (no auth), but it only
-- becomes publicly visible once an admin approves it — the same "public
-- insert, admin-gated visibility" pattern already used for orders/checkout.
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  author_name text not null check (char_length(trim(author_name)) >= 2),
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_reviews_product_id_idx on public.product_reviews (product_id);

alter table public.product_reviews enable row level security;

create policy "public submit review" on public.product_reviews
  for insert with check (true);

create policy "public read approved reviews" on public.product_reviews
  for select using (is_approved = true or public.is_admin());

create policy "admin update reviews" on public.product_reviews
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admin delete reviews" on public.product_reviews
  for delete using (public.is_admin());
