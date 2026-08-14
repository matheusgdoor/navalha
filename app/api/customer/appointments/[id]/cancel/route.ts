import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getCustomerSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params,
    settings = (
      await query<any>(
        "SELECT cancellation_notice_hours FROM business_settings WHERE organization_id=$1",
        [s.organizationId],
      )
    ).rows[0],
    hours = settings?.cancellation_notice_hours ?? 2;
  const row = (
    await query(
      "UPDATE appointments SET status='CANCELED',notes=concat_ws(E'\\n',notes,'Cancelado pelo cliente no portal') WHERE id=$1 AND client_id=$2 AND organization_id=$3 AND status IN('PENDING','CONFIRMED') AND starts_at>now()+($4||' hours')::interval RETURNING id",
      [id, s.clientId, s.organizationId, hours],
    )
  ).rows[0];
  return row
    ? NextResponse.json({ ok: true })
    : NextResponse.json(
        {
          error: `O cancelamento deve ser feito com pelo menos ${hours}h de antecedência`,
        },
        { status: 409 },
      );
}
