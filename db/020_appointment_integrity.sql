CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS public_request_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS appointments_public_request_key_idx
  ON appointments(organization_id,public_request_key)
  WHERE public_request_key IS NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='appointments_no_barber_overlap'
  ) THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_no_barber_overlap
      EXCLUDE USING gist (
        organization_id WITH =,
        barber_id WITH =,
        tstzrange(starts_at,ends_at,'[)') WITH &&
      ) WHERE (status<>'CANCELED');
  END IF;
END $$;
