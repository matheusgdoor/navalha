-- Remove somente os registros demonstrativos criados por 001_initial.sql.
-- Registros já utilizados em agendamentos são preservados para manter o histórico.

DELETE FROM barbers AS barber
WHERE barber.phone IN ('(65) 99999-1001', '(65) 99999-1002')
  AND barber.name IN ('Lucas', 'André')
  AND NOT EXISTS (
    SELECT 1
    FROM appointments AS appointment
    WHERE appointment.barber_id = barber.id
  );

DELETE FROM services AS service
WHERE (
    (service.name = 'Corte degradê' AND service.price_cents = 4500 AND service.duration_minutes = 45)
    OR (service.name = 'Corte + barba' AND service.price_cents = 7500 AND service.duration_minutes = 60)
    OR (service.name = 'Barba completa' AND service.price_cents = 4000 AND service.duration_minutes = 30)
    OR (service.name = 'Corte clássico' AND service.price_cents = 4000 AND service.duration_minutes = 40)
    OR (service.name = 'Corte + sobrancelha' AND service.price_cents = 5500 AND service.duration_minutes = 50)
    OR (service.name = 'Corte infantil' AND service.price_cents = 3500 AND service.duration_minutes = 35)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM appointments AS appointment
    WHERE appointment.service_id = service.id
  );
