import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction, query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  barberId: z.string().uuid(),
  from: z.string().date(),
  to: z.string().date(),
});
const statusSchema = z.object({ id: z.string().uuid(), status: z.enum(["PENDING", "PAID"]), notes: z.string().max(500).optional() });
export async function GET() {
  const s = await requireSession();
  if (!s || s.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    return NextResponse.json(
      (
        await query(
          `SELECT cc.id,cc.barber_id AS "barberId",b.name AS barber,cc.period_start AS "periodStart",cc.period_end AS "periodEnd",
           cc.revenue_cents AS "revenueCents",cc.commission_percent AS "commissionPercent",cc.commission_cents AS "commissionCents",
           cc.status,cc.closed_at AS "closedAt",cc.paid_at AS "paidAt",cc.notes
           FROM commission_closures cc JOIN barbers b ON b.id=cc.barber_id WHERE cc.organization_id=$1 ORDER BY cc.period_end DESC,cc.closed_at DESC`,
          [s.organizationId],
        )
      ).rows,
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s || s.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await req.json());
    const row = await transaction(async (c) => {
      const r = await c.query<{
        revenue: number;
        commission_percent: string;
        commission: number;
      }>(
        `SELECT COALESCE(sum(p.amount_cents),0)::int revenue,b.commission_percent,round(COALESCE(sum(p.amount_cents),0)*b.commission_percent/100)::int commission FROM barbers b LEFT JOIN appointments a ON a.barber_id=b.id AND a.organization_id=$4 LEFT JOIN payments p ON p.appointment_id=a.id AND p.organization_id=$4 AND p.paid_at >= $2::date AND p.paid_at < $3::date+interval '1 day' WHERE b.id=$1 AND b.organization_id=$4 GROUP BY b.id`,
        [x.barberId, x.from, x.to, s.organizationId],
      );
      if (!r.rows[0]) throw new Error("Barbeiro não encontrado");
      const v = r.rows[0];
      const existing = await c.query("SELECT status FROM commission_closures WHERE barber_id=$1 AND period_start=$2 AND period_end=$3 FOR UPDATE", [x.barberId,x.from,x.to]);
      if (existing.rows[0]?.status === "PAID") throw new Error("Este fechamento já foi pago e não pode ser recalculado");
      return (
        await c.query(
          "INSERT INTO commission_closures(organization_id,barber_id,period_start,period_end,revenue_cents,commission_percent,commission_cents,closed_by,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PENDING') ON CONFLICT(barber_id,period_start,period_end) DO UPDATE SET revenue_cents=excluded.revenue_cents,commission_percent=excluded.commission_percent,commission_cents=excluded.commission_cents,closed_at=now(),status='PENDING' RETURNING *",
          [
            s.organizationId,
            x.barberId,
            x.from,
            x.to,
            v.revenue,
            v.commission_percent,
            v.commission,
            s.sub,
          ],
        )
      ).rows[0];
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Período inválido" }, { status: 400 });
    return apiError(e);
  }
}

export async function PATCH(req: Request) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const input = statusSchema.parse(await req.json());
    const result = await query(
      `UPDATE commission_closures SET status=$1,paid_at=CASE WHEN $1='PAID' THEN COALESCE(paid_at,now()) ELSE NULL END,
       notes=COALESCE($2,notes) WHERE id=$3 AND organization_id=$4 RETURNING id,status,paid_at AS "paidAt",notes`,
      [input.status,input.notes || null,input.id,session.organizationId],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Fechamento não encontrado" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return apiError(error);
  }
}
