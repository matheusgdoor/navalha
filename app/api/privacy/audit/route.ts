import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "ALL";
    const result = await query(
      `SELECT * FROM (
        SELECT pc.id,'CONSENT'::text AS category,pc.purpose AS type,'COMPLETED'::text AS status,
          COALESCE(u.name,pc.subject_email,'Titular') AS subject,pc.source,pc.policy_version AS detail,
          pc.accepted_at AS "createdAt",pc.revoked_at AS "revokedAt"
        FROM privacy_consents pc LEFT JOIN users u ON u.id=pc.user_id
        WHERE pc.organization_id=$1
        UNION ALL
        SELECT pr.id,'REQUEST'::text AS category,pr.request_type AS type,pr.status,
          COALESCE(c.name,u.name,'Organização') AS subject,COALESCE(u.name,'Sistema') AS source,
          pr.details::text AS detail,pr.created_at AS "createdAt",NULL::timestamptz AS "revokedAt"
        FROM privacy_requests pr LEFT JOIN clients c ON c.id=pr.client_id LEFT JOIN users u ON u.id=pr.requested_by
        WHERE pr.organization_id=$1
      ) history WHERE ($2='ALL' OR category=$2 OR type=$2) ORDER BY "createdAt" DESC LIMIT 200`,
      [session.organizationId, type],
    );
    const summary = await query<any>(
      `SELECT
        (SELECT count(*)::int FROM privacy_consents WHERE organization_id=$1 AND revoked_at IS NULL) consents,
        (SELECT count(*)::int FROM privacy_requests WHERE organization_id=$1 AND request_type='ORGANIZATION_EXPORT') exports,
        (SELECT count(*)::int FROM privacy_requests WHERE organization_id=$1 AND request_type='CLIENT_ANONYMIZATION') anonymizations`,
      [session.organizationId],
    );
    return NextResponse.json({ summary: summary.rows[0], history: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
