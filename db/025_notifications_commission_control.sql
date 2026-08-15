DELETE FROM message_queue older USING message_queue newer
WHERE older.appointment_id=newer.appointment_id AND older.event=newer.event
  AND (older.created_at,older.id)<(newer.created_at,newer.id);
CREATE UNIQUE INDEX IF NOT EXISTS message_queue_appointment_event_idx ON message_queue(appointment_id,event);

ALTER TABLE commission_closures ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE commission_closures ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE commission_closures ADD COLUMN IF NOT EXISTS notes varchar(500);
DO $$ BEGIN
  ALTER TABLE commission_closures ADD CONSTRAINT commission_closures_status_check CHECK(status IN('PENDING','PAID'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS commission_closures_org_status_idx ON commission_closures(organization_id,status,period_end DESC);
