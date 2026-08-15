-- Catálogo inicial multitenant. Cada serviço é vinculado explicitamente à
-- organização padrão e pode ser editado ou desativado posteriormente.

INSERT INTO services (
  name,
  price_cents,
  duration_minutes,
  active,
  organization_id
)
SELECT
  catalog.name,
  catalog.price_cents,
  catalog.duration_minutes,
  true,
  organization.id
FROM organizations AS organization
CROSS JOIN (
  VALUES
    ('Corte degradê', 4500, 45),
    ('Corte + barba', 7500, 60),
    ('Barba completa', 4000, 30),
    ('Corte clássico', 4000, 40),
    ('Corte + sobrancelha', 5500, 50),
    ('Corte infantil', 3500, 35)
) AS catalog(name, price_cents, duration_minutes)
WHERE organization.slug = 'navalha'
  AND NOT EXISTS (
    SELECT 1
    FROM services AS existing
    WHERE existing.organization_id = organization.id
      AND lower(existing.name) = lower(catalog.name)
  );
