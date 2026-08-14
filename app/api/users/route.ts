import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
export async function GET() {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const users = (
    await query(
      `SELECT u.id,u.name,u.email,om.role,om.active,om.created_at AS "createdAt",b.id AS "barberId" FROM organization_members om JOIN users u ON u.id=om.user_id LEFT JOIN barbers b ON b.user_id=u.id AND b.organization_id=om.organization_id WHERE om.organization_id=$1 ORDER BY u.name`,
      [s.organizationId],
    )
  ).rows;
  const invitations = (
    await query(
      `SELECT id,email,role,expires_at AS "expiresAt",created_at AS "createdAt" FROM organization_invitations WHERE organization_id=$1 AND accepted_at IS NULL AND canceled_at IS NULL ORDER BY created_at DESC`,
      [s.organizationId],
    )
  ).rows;
  return NextResponse.json({ users, invitations });
}
