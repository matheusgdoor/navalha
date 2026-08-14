import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction, query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  appointmentId: z.string().uuid(),
  method: z.enum(["CASH", "PIX", "CARD"]),
});
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const values: unknown[] = [s.organizationId],
      filter =
        s.role === "BARBER" ? (values.push(s.sub), " AND b.user_id=$2") : "";
    const r = await query(
      `SELECT p.id,p.appointment_id AS "appointmentId",p.amount_cents AS "amountCents",p.method,p.paid_at AS "paidAt",c.name AS client,s.name AS service,b.name AS barber FROM payments p JOIN appointments a ON a.id=p.appointment_id JOIN clients c ON c.id=a.client_id JOIN services s ON s.id=a.service_id JOIN barbers b ON b.id=a.barber_id WHERE p.organization_id=$1${filter} ORDER BY p.paid_at DESC`,
      values,
    );
    return NextResponse.json(r.rows);
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const x = schema.parse(await req.json());
    const result = await transaction(async (c) => {
      const a = await c.query<{ price_cents: number; user_id: string | null }>(
        "SELECT s.price_cents,b.user_id FROM appointments a JOIN services s ON s.id=a.service_id JOIN barbers b ON b.id=a.barber_id WHERE a.id=$1 AND a.organization_id=$2 FOR UPDATE",
        [x.appointmentId, s.organizationId],
      );
      if (!a.rows[0]) throw new Error("Agendamento não encontrado");
      if (s.role === "BARBER" && a.rows[0].user_id !== s.sub)
        throw new Error("Acesso negado");
      const p = await c.query(
        "INSERT INTO payments(organization_id,appointment_id,amount_cents,method,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(appointment_id) DO UPDATE SET method=excluded.method,paid_at=now() RETURNING *",
        [
          s.organizationId,
          x.appointmentId,
          a.rows[0].price_cents,
          x.method,
          s.sub,
        ],
      );
      await c.query(
        "UPDATE appointments SET status='COMPLETED' WHERE id=$1 AND organization_id=$2",
        [x.appointmentId, s.organizationId],
      );
      return p.rows[0];
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Acesso negado")
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return apiError(e);
  }
}
