import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction, query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  barberId: z.string().uuid(),
  from: z.string().date(),
  to: z.string().date(),
});
export async function GET() {
  const s = await requireSession();
  if (!s || s.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    return NextResponse.json(
      (
        await query(
          "SELECT cc.*,b.name AS barber FROM commission_closures cc JOIN barbers b ON b.id=cc.barber_id WHERE cc.organization_id=$1 ORDER BY closed_at DESC",
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
      return (
        await c.query(
          "INSERT INTO commission_closures(organization_id,barber_id,period_start,period_end,revenue_cents,commission_percent,commission_cents,closed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(barber_id,period_start,period_end) DO UPDATE SET revenue_cents=excluded.revenue_cents,commission_cents=excluded.commission_cents,closed_at=now() RETURNING *",
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
