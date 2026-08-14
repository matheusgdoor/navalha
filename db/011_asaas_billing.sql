CREATE TABLE IF NOT EXISTS billing_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id),
  provider varchar(30) NOT NULL DEFAULT 'ASAAS',
  provider_checkout_id text UNIQUE,
  requested_plan varchar(30) NOT NULL REFERENCES plans(code),
  amount_cents integer NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'CREATING' CHECK(status IN('CREATING','PENDING','PAID','CANCELED','EXPIRED','FAILED')),
  checkout_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_checkouts_org_idx ON billing_checkouts(organization_id,created_at DESC);
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  provider varchar(30) NOT NULL,
  event_id text NOT NULL,
  event_type varchar(80) NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,event_id)
);
