-- Operating expenses (loyer, pub, livraison, salaires...) — lets the
-- Comptabilité page go from "bénéfice brut" (revenue - COGS) to a real net
-- result (revenue - COGS - expenses). Admin-only, same shape as promo_codes.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(trim(category)) >= 1),
  label text not null check (char_length(trim(label)) >= 1),
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index expenses_expense_date_idx on public.expenses (expense_date);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy "admin manage expenses" on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());
