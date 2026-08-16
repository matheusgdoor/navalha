CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id bigserial PRIMARY KEY,
  scope varchar(20) NOT NULL CHECK(scope IN('BUSINESS','PLATFORM')),
  identifier_hash varchar(64) NOT NULL,
  origin_hash varchar(64) NOT NULL,
  success boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_login_attempts_identifier_idx ON auth_login_attempts(scope,identifier_hash,attempted_at DESC);
CREATE INDEX IF NOT EXISTS auth_login_attempts_origin_idx ON auth_login_attempts(scope,origin_hash,attempted_at DESC);
DELETE FROM auth_login_attempts WHERE attempted_at<now()-interval '30 days';
