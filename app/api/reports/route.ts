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
      barberId = u.searchParams.get("barberId") || null,
      summary = (
        await query<any>(
          `SELECT COALESCE(sum(p.amount_cents),0)::text revenue,count(*)::text payments,COALESCE(avg(p.amount_cents),0)::text ticket
           FROM payments p JOIN appointments a ON a.id=p.appointment_id
           WHERE p.organization_id=$1 AND p.paid_at BETWEEN $2 AND $3 AND ($4::uuid IS NULL OR a.barber_id=$4)`,
          [s.organizationId, from, to, barberId],
        )
      ).rows[0],
      barbers = (
        await query(
          `SELECT b.id,b.name,b.commission_percent AS "commissionPercent",COALESCE(sum(p.amount_cents),0)::int revenue,round(COALESCE(sum(p.amount_cents),0)*b.commission_percent/100)::int commission,count(p.id)::int services FROM barbers b LEFT JOIN appointments a ON a.barber_id=b.id AND a.organization_id=$1 LEFT JOIN payments p ON p.appointment_id=a.id AND p.organization_id=$1 AND p.paid_at BETWEEN $2 AND $3 WHERE b.organization_id=$1 AND ($4::uuid IS NULL OR b.id=$4) GROUP BY b.id ORDER BY revenue DESC`,
          [s.organizationId, from, to, barberId],
        )
      ).rows,
      methods = (
        await query(
          `SELECT p.method,count(*)::int payments,COALESCE(sum(p.amount_cents),0)::int revenue FROM payments p JOIN appointments a ON a.id=p.appointment_id WHERE p.organization_id=$1 AND p.paid_at BETWEEN $2 AND $3 AND ($4::uuid IS NULL OR a.barber_id=$4) GROUP BY p.method ORDER BY revenue DESC`,
          [s.organizationId, from, to, barberId],
        )
      ).rows,
      availableBarbers = (
        await query('SELECT id,name FROM barbers WHERE organization_id=$1 AND active=true ORDER BY name', [s.organizationId])
      ).rows;
    return NextResponse.json({
      from,
      to,
      summary: {
        revenue: Number(summary.revenue),
        payments: Number(summary.payments),
        ticket: Math.round(Number(summary.ticket)),
        commission: (barbers as any[]).reduce((total, barber: any) => total + barber.commission, 0),
        net: Number(summary.revenue) - (barbers as any[]).reduce((total, barber: any) => total + barber.commission, 0),
      },
      barbers,
      methods,
      availableBarbers,
    });
  } catch (e) {
    return apiError(e);
  }
}
