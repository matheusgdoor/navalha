CREATE TABLE IF NOT EXISTS customer_login_attempts (
  id bigserial PRIMARY KEY,
  identifier_hash varchar(64) NOT NULL,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_login_attempts_lookup_idx ON customer_login_attempts(identifier_hash,attempted_at DESC);
DELETE FROM customer_login_attempts WHERE attempted_at < now()-interval '30 days';
