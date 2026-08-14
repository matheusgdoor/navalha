CREATE TABLE IF NOT EXISTS platform_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_audit_org_created_idx ON platform_audit(organization_id, created_at DESC);
