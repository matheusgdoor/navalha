ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS manual_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS manually_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS manually_suspended_by uuid REFERENCES users(id);
