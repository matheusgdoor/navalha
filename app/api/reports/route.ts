import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";
export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const u = new URL(req.url),
      from =
        u.searchParams.get("from") ||
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ).toISOString(),
      to = u.searchParams.get("to") || new Date().toISOString(),
      summary = (
        await query<any>(
          "SELECT COALESCE(sum(amount_cents),0)::text revenue,count(*)::text payments,COALESCE(avg(amount_cents),0)::text ticket FROM payments WHERE organization_id=$1 AND paid_at BETWEEN $2 AND $3",
          [s.organizationId, from, to],
        )
      ).rows[0],
      barbers = (
        await query(
          `SELECT b.id,b.name,b.commission_percent AS "commissionPercent",COALESCE(sum(p.amount_cents),0)::int revenue,round(COALESCE(sum(p.amount_cents),0)*b.commission_percent/100)::int commission,count(p.id)::int services FROM barbers b LEFT JOIN appointments a ON a.barber_id=b.id LEFT JOIN payments p ON p.appointment_id=a.id AND p.paid_at BETWEEN $2 AND $3 WHERE b.organization_id=$1 GROUP BY b.id ORDER BY revenue DESC`,
          [s.organizationId, from, to],
        )
      ).rows;
    return NextResponse.json({
      from,
      to,
      summary: {
        revenue: Number(summary.revenue),
        payments: Number(summary.payments),
        ticket: Math.round(Number(summary.ticket)),
      },
      barbers,
    });
  } catch (e) {
    return apiError(e);
  }
}
