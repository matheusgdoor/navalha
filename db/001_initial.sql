CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('ADMIN', 'BARBER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('CASH', 'PIX', 'CARD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL,
  email varchar(180) UNIQUE NOT NULL, password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'BARBER', active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name varchar(120) NOT NULL, phone varchar(30), commission_percent numeric(5,2) NOT NULL DEFAULT 35,
  color varchar(10) NOT NULL DEFAULT '#637c68', active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL, phone varchar(30),
  email varchar(180), notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(120) NOT NULL UNIQUE,
  price_cents integer NOT NULL CHECK(price_cents >= 0), duration_minutes integer NOT NULL CHECK(duration_minutes > 0),
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id),
  barber_id uuid NOT NULL REFERENCES barbers(id), service_id uuid NOT NULL REFERENCES services(id),
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status appointment_status NOT NULL DEFAULT 'CONFIRMED',
  notes text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS appointments_barber_time_idx ON appointments(barber_id, starts_at, ends_at);
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), appointment_id uuid UNIQUE NOT NULL REFERENCES appointments(id),
  amount_cents integer NOT NULL CHECK(amount_cents >= 0), method payment_method NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
