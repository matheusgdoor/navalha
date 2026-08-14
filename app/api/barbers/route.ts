import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(
      (
        await query(
          'SELECT id,name,phone,commission_percent AS "commissionPercent",color,active FROM barbers WHERE organization_id=$1 ORDER BY name',
          [s.organizationId],
        )
      ).rows,
    );
  } catch (e) {
    return apiError(e);
  }
}
