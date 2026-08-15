import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ authenticated: false });
  try {
    const result = await query(
      "SELECT 1 FROM privacy_consents WHERE organization_id=$1 AND user_id=$2 AND purpose='TERMS_AND_PRIVACY' AND policy_version=$3 AND revoked_at IS NULL LIMIT 1",
      [session.organizationId, session.sub, PRIVACY_POLICY_VERSION],
    );
    return NextResponse.json({ authenticated: true, accepted: (result.rowCount ?? 0) > 0 });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    await query(
      `INSERT INTO privacy_consents(organization_id,user_id,subject_email,purpose,legal_basis,policy_version,source)
       VALUES($1,$2,lower($3),'TERMS_AND_PRIVACY','CONSENT',$4,'ADMIN_CONFIRMATION')
       ON CONFLICT (organization_id,user_id,purpose,policy_version)
       WHERE user_id IS NOT NULL AND revoked_at IS NULL DO NOTHING`,
      [session.organizationId, session.sub, session.email, PRIVACY_POLICY_VERSION],
    );
    return NextResponse.json({ accepted: true });
  } catch (error) {
    return apiError(error);
  }
}
