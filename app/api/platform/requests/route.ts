import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json(
      { error: "Acesso restrito à plataforma" },
      { status: 403 },
    );
  const result =
    await query(`SELECT r.id,r.current_plan AS "currentPlan",r.requested_plan AS "requestedPlan",r.status,r.notes,
    r.created_at AS "createdAt",r.reviewed_at AS "reviewedAt",o.name AS organization,o.id AS "organizationId",
    requester.name AS "requestedBy",reviewer.name AS "reviewedBy"
    FROM plan_change_requests r JOIN organizations o ON o.id=r.organization_id
    JOIN users requester ON requester.id=r.requested_by LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by
    ORDER BY CASE WHEN r.status='PENDING' THEN 0 ELSE 1 END,r.created_at DESC`);
  return NextResponse.json(result.rows);
}
