-- Remove somente os barbeiros demonstrativos criados por 001_initial.sql.
-- O catálogo inicial de serviços é mantido para a empresa editar ou desativar.
-- Registros já utilizados em agendamentos são preservados para manter o histórico.

DELETE FROM barbers AS barber
WHERE barber.phone IN ('(65) 99999-1001', '(65) 99999-1002')
  AND barber.name IN ('Lucas', 'André')
  AND NOT EXISTS (
    SELECT 1
    FROM appointments AS appointment
    WHERE appointment.barber_id = barber.id
  );
