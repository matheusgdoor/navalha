import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";
export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const limit = Math.min(
        Number(new URL(req.url).searchParams.get("limit") || 100),
        500,
      ),
      r = await query(
        `SELECT aa.id,aa.action,aa.created_at AS "createdAt",aa.previous_data AS "previousData",aa.new_data AS "newData",c.name client,b.name barber,sv.name service,u.name user_name FROM appointment_audit aa JOIN appointments a ON a.id=aa.appointment_id JOIN clients c ON c.id=a.client_id JOIN barbers b ON b.id=a.barber_id JOIN services sv ON sv.id=a.service_id LEFT JOIN users u ON u.id=aa.user_id WHERE aa.organization_id=$1 ORDER BY aa.created_at DESC LIMIT $2`,
        [s.organizationId, limit],
      );
    return NextResponse.json(r.rows);
  } catch (e) {
    return apiError(e);
  }
}
