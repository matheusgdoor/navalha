import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
export async function GET() {
  const s = await getSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const barber =
    s.role === "BARBER"
      ? (
          await query<{ id: string }>(
            "SELECT id FROM barbers WHERE user_id=$1 AND organization_id=$2 AND active=true",
            [s.sub, s.organizationId],
          )
        ).rows[0]
      : null;
  const features =
    (
      await query<any>(
        'SELECT inventory_sales AS "inventorySales",loyalty FROM organization_features WHERE organization_id=$1',
        [s.organizationId],
      )
    ).rows[0] || {};
  return NextResponse.json({
    id: s.sub,
    name: s.name,
    email: s.email,
    role: s.role,
    barberId: barber?.id || null,
    organizationId: s.organizationId,
    organizationSlug: s.organizationSlug,
    features,
  });
}
