ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf varchar(14);
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS document varchar(18);
CREATE UNIQUE INDEX IF NOT EXISTS clients_org_cpf_key ON clients(organization_id,cpf) WHERE cpf IS NOT NULL;
