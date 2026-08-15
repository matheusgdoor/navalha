import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET(request: Request) {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const organization = searchParams.get("organization")?.trim() || null;
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 30, 1), 100);
    const result = await query(
      `SELECT pa.id,pa.action,pa.previous_data AS "previousData",pa.new_data AS "newData",
       pa.created_at AS "createdAt",u.name AS actor,u.email,o.name AS organization,o.id AS "organizationId"
       FROM platform_audit pa JOIN users u ON u.id=pa.actor_id
       LEFT JOIN organizations o ON o.id=pa.organization_id
       WHERE ($1::uuid IS NULL OR pa.organization_id=$1::uuid)
       ORDER BY pa.created_at DESC LIMIT $2`,
      [organization, limit],
    );
    return NextResponse.json({ events: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
