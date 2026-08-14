CREATE TABLE IF NOT EXISTS organization_features(
 organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
 inventory_sales boolean NOT NULL DEFAULT false,
 loyalty boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES users(id)
);
INSERT INTO organization_features(organization_id,inventory_sales)
SELECT id,true FROM organizations WHERE slug='navalha' ON CONFLICT(organization_id) DO NOTHING;
INSERT INTO organization_features(organization_id)
SELECT id FROM organizations ON CONFLICT(organization_id) DO NOTHING;
