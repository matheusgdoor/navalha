ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS public_description varchar(240),
  ADD COLUMN IF NOT EXISTS instagram varchar(80);
