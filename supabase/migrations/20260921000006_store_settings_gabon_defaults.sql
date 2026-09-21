-- The store operates in Gabon (+241), not Senegal (+221) — this only fixes
-- the column default for future/fresh installs; the live settings row
-- already has the correct +241 WhatsApp number and is left untouched.
alter table public.store_settings alter column whatsapp_number set default '24106000000';
