CREATE TABLE IF NOT EXISTS cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','CLOSED')),
  opening_cash_cents integer NOT NULL DEFAULT 0 CHECK(opening_cash_cents>=0),
  expected_cash_cents integer,
  expected_pix_cents integer,
  expected_card_cents integer,
  counted_cash_cents integer,
  counted_pix_cents integer,
  counted_card_cents integer,
  difference_cents integer,
  notes varchar(500),
  opened_by uuid NOT NULL REFERENCES users(id),
  closed_by uuid REFERENCES users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE(organization_id,business_date)
);
CREATE INDEX IF NOT EXISTS cash_registers_org_date_idx ON cash_registers(organization_id,business_date DESC);
