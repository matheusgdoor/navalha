ALTER TABLE billing_checkouts
  ADD COLUMN IF NOT EXISTS provider_payment_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS billing_type varchar(20) NOT NULL DEFAULT 'CHECKOUT',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS pix_payload text,
  ADD COLUMN IF NOT EXISTS pix_encoded_image text,
  ADD COLUMN IF NOT EXISTS pix_expiration_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS period_months integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS billing_checkouts_payment_idx
  ON billing_checkouts(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
