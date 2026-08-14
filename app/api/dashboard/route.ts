import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const values: unknown[] = [s.organizationId],
      scope =
        s.role === "BARBER" ? (values.push(s.sub), " AND b.user_id=$2") : "";
    const stats = (
        await query<any>(
          `SELECT count(*) FILTER(WHERE a.starts_at::date=(now() AT TIME ZONE 'America/Cuiaba')::date AND a.status<>'CANCELED')::int AS "todayAppointments",count(*) FILTER(WHERE a.status='PENDING')::int pending,min(a.starts_at) FILTER(WHERE a.starts_at>now() AND a.status IN ('PENDING','CONFIRMED')) AS "nextAt" FROM appointments a JOIN barbers b ON b.id=a.barber_id WHERE a.organization_id=$1${scope}`,
          values,
        )
      ).rows[0],
      revenue = (
        await query<any>(
          `SELECT COALESCE(sum(p.amount_cents),0)::int revenue FROM payments p JOIN appointments a ON a.id=p.appointment_id JOIN barbers b ON b.id=a.barber_id WHERE p.organization_id=$1 AND p.paid_at::date=(now() AT TIME ZONE 'America/Cuiaba')::date${scope}`,
          values,
        )
      ).rows[0],
      clients =
        s.role === "ADMIN"
          ? (
              await query<any>(
                "SELECT count(*)::int total FROM clients WHERE organization_id=$1",
                [s.organizationId],
              )
            ).rows[0].total
          : null;
    return NextResponse.json({ ...stats, revenue: revenue.revenue, clients });
  } catch (e) {
    return apiError(e);
  }
}
