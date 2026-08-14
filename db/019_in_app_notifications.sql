CREATE TABLE IF NOT EXISTS app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  type varchar(30) NOT NULL,
  title varchar(160) NOT NULL,
  message text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,user_id,source_key)
);
CREATE INDEX IF NOT EXISTS app_notifications_user_idx
  ON app_notifications(user_id,read_at,created_at DESC);
