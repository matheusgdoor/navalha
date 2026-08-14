CREATE TABLE IF NOT EXISTS password_reset_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_tokens(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS organization_invitations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 email varchar(180) NOT NULL,role user_role NOT NULL,token_hash text NOT NULL UNIQUE,invited_by uuid NOT NULL REFERENCES users(id),
 expires_at timestamptz NOT NULL,accepted_at timestamptz,canceled_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS organization_invite_pending_idx ON organization_invitations(organization_id,lower(email)) WHERE accepted_at IS NULL AND canceled_at IS NULL;
