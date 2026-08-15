CREATE TABLE IF NOT EXISTS privacy_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  subject_email varchar(180),
  purpose varchar(80) NOT NULL,
  legal_basis varchar(40) NOT NULL,
  policy_version varchar(20) NOT NULL,
  source varchar(40) NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS privacy_consents_org_idx ON privacy_consents(organization_id,accepted_at DESC);
CREATE INDEX IF NOT EXISTS privacy_consents_client_idx ON privacy_consents(client_id,accepted_at DESC);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  request_type varchar(30) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'COMPLETED',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS privacy_requests_org_idx ON privacy_requests(organization_id,created_at DESC);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;
