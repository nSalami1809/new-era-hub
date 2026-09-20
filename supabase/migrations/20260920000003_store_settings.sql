-- Singleton table: exactly one row (id = 1) holds the shop-wide settings.
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'New Era Hub 241',
  logo_text text not null default 'NEH241',
  logo_url text,
  whatsapp_number text not null default '221770000000',
  currency text not null default 'FCFA',
  email text,
  phone text,
  address text,
  instagram text,
  facebook text,
  updated_at timestamptz not null default now()
);

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

insert into public.store_settings (id) values (1);
