ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_pkey;
ALTER TABLE business_settings ADD CONSTRAINT business_settings_pkey PRIMARY KEY(organization_id);
