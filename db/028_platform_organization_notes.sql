CREATE TABLE IF NOT EXISTS platform_organization_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  category varchar(30) NOT NULL DEFAULT 'SUPPORT' CHECK(category IN('SUPPORT','COMMERCIAL','FINANCIAL','SECURITY')),
  note varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_organization_notes_org_created_idx ON platform_organization_notes(organization_id,created_at DESC);
