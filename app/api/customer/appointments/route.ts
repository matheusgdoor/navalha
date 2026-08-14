import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
export async function GET() {
  const s = await getCustomerSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const settings = (
    await query<any>(
      "SELECT cancellation_notice_hours FROM business_settings WHERE organization_id=$1",
      [s.organizationId],
    )
  ).rows[0];
  const rows = (
    await query(
      `SELECT a.id,a.service_id AS "serviceId",a.barber_id AS "barberId",a.starts_at AS "startsAt",a.ends_at AS "endsAt",a.status,sv.name AS service,sv.price_cents AS "priceCents",b.name AS barber FROM appointments a JOIN services sv ON sv.id=a.service_id JOIN barbers b ON b.id=a.barber_id WHERE a.client_id=$1 AND a.organization_id=$2 ORDER BY a.starts_at DESC`,
      [s.clientId, s.organizationId],
    )
  ).rows;
  return NextResponse.json({
    customer: { name: s.name, organizationSlug: s.organizationSlug },
    cancellationNoticeHours: settings?.cancellation_notice_hours ?? 2,
    appointments: rows,
  });
}
