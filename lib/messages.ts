import type { PoolClient } from "pg";
export async function queueMessage(
  c: PoolClient,
  appointmentId: string,
  event: "CONFIRMATION" | "REMINDER" | "CANCELLATION",
) {
  const r = await c.query(
      `SELECT a.organization_id,a.starts_at,c.name,c.phone,b.name barber,s.name service FROM appointments a JOIN clients c ON c.id=a.client_id JOIN barbers b ON b.id=a.barber_id JOIN services s ON s.id=a.service_id WHERE a.id=$1`,
      [appointmentId],
    ),
    x = r.rows[0];
  if (!x?.phone) return;
  await c.query(
    "INSERT INTO message_queue(organization_id,appointment_id,event,recipient,payload,scheduled_at) VALUES($1,$2,$3,$4,$5,$6)",
    [
      x.organization_id,
      appointmentId,
      event,
      x.phone,
      JSON.stringify({
        client: x.name,
        barber: x.barber,
        service: x.service,
        startsAt: x.starts_at,
      }),
      event === "REMINDER"
        ? new Date(new Date(x.starts_at).getTime() - 86400000)
        : new Date(),
    ],
  );
}
