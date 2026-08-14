import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction, query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
import { requireEntitlement } from "@/lib/entitlements";
const schema = z.object({
  clientId: z.string().uuid(),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});
const select = `SELECT a.id,a.starts_at AS "startsAt",a.ends_at AS "endsAt",a.status,a.notes,c.name AS client,b.name AS barber,s.name AS service,s.price_cents AS "priceCents",s.duration_minutes AS "durationMinutes" FROM appointments a JOIN clients c ON c.id=a.client_id JOIN barbers b ON b.id=a.barber_id JOIN services s ON s.id=a.service_id`;
export async function GET(req: Request) {
  const session = await requireSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const date = new URL(req.url).searchParams.get("date"),
      values: unknown[] = [session.organizationId],
      where: string[] = ["a.organization_id=$1"];
    if (date) {
      values.push(date);
      where.push(
        `a.starts_at >= $${values.length}::date AND a.starts_at < $${values.length}::date + interval '1 day'`,
      );
    }
    if (session.role === "BARBER") {
      values.push(session.sub);
      where.push(`b.user_id=$${values.length}`);
    }
    const r = await query(
      select +
        (where.length ? " WHERE " + where.join(" AND ") : "") +
        " ORDER BY a.starts_at DESC LIMIT 200",
      values,
    );
    return NextResponse.json(r.rows);
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const session = await requireSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    await requireEntitlement(session, "appointment");
    const x = schema.parse(await req.json());
    if (session.role === "BARBER") {
      const own = await query(
        "SELECT 1 FROM barbers WHERE id=$1 AND user_id=$2 AND organization_id=$3 AND active=true",
        [x.barberId, session.sub, session.organizationId],
      );
      if (!own.rowCount)
        return NextResponse.json(
          { error: "Você só pode agendar para sua própria agenda" },
          { status: 403 },
        );
    }
    const result = await transaction(async (client) => {
      const svc = await client.query<{ duration_minutes: number }>(
        "SELECT duration_minutes FROM services WHERE id=$1 AND organization_id=$2 AND active=true AND EXISTS(SELECT 1 FROM clients WHERE id=$3 AND organization_id=$2) AND EXISTS(SELECT 1 FROM barbers WHERE id=$4 AND organization_id=$2)",
        [x.serviceId, session.organizationId, x.clientId, x.barberId],
      );
      if (!svc.rows[0]) throw new Error("Serviço não encontrado");
      const endsAt = new Date(
          new Date(x.startsAt).getTime() + svc.rows[0].duration_minutes * 60000,
        ),
        conflict = await client.query(
          "SELECT 1 FROM appointments WHERE barber_id=$1 AND status<>'CANCELED' AND starts_at<$3 AND ends_at>$2 FOR UPDATE",
          [x.barberId, x.startsAt, endsAt],
        );
      if (conflict.rowCount)
        throw new Error("Este barbeiro já possui atendimento nesse período");
      return (
        await client.query(
          "INSERT INTO appointments(organization_id,client_id,barber_id,service_id,starts_at,ends_at,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            session.organizationId,
            x.clientId,
            x.barberId,
            x.serviceId,
            x.startsAt,
            endsAt,
            x.notes || null,
            session.sub,
          ],
        )
      ).rows[0];
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    if (
      (e as { code?: string })?.code === "23P01" ||
      (e instanceof Error && e.message.includes("já possui"))
    )
      return NextResponse.json(
        { error: "Este barbeiro já possui atendimento nesse período" },
        { status: 409 },
      );
    return apiError(e);
  }
}
