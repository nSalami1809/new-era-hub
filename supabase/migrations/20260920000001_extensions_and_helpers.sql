-- Extensions and shared helpers used by every table below.

create extension if not exists pgcrypto with schema public;

create type public.order_status as enum (
  'Nouvelle',
  'Contacté',
  'Paiement en attente',
  'Payée',
  'En préparation',
  'Expédiée',
  'Livrée',
  'Annulée'
);

-- Generic "touch updated_at" trigger reused by every table that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
