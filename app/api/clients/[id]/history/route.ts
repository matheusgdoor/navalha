import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params,
      c = (
        await query(
          "SELECT * FROM clients WHERE id=$1 AND organization_id=$2",
          [id, s.organizationId],
        )
      ).rows[0];
    if (!c)
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 },
      );
    const a = (
      await query(
        `SELECT a.id,a.starts_at AS "startsAt",a.status,sv.name service,b.name barber,sv.price_cents AS "priceCents",p.paid_at AS "paidAt" FROM appointments a JOIN services sv ON sv.id=a.service_id JOIN barbers b ON b.id=a.barber_id LEFT JOIN payments p ON p.appointment_id=a.id WHERE a.client_id=$1 AND a.organization_id=$2 ORDER BY a.starts_at DESC`,
        [id, s.organizationId],
      )
    ).rows;
    return NextResponse.json({ client: c, appointments: a });
  } catch (e) {
    return apiError(e);
  }
}
