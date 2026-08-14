import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { query } from "@/lib/db";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/customer-auth";
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})),
    code = String(body.code || ""),
    phone = String(body.phone || ""),
    slug = String(body.organization || "navalha"),
    hash = createHash("sha256").update(code).digest("hex");
  const row = (
    await query<any>(
      `SELECT ac.id,c.id AS client_id,c.name,c.organization_id,o.slug FROM customer_access_codes ac JOIN clients c ON c.id=ac.client_id JOIN organizations o ON o.id=ac.organization_id WHERE ac.code_hash=$1 AND ac.used_at IS NULL AND ac.expires_at>now() AND ac.attempts<5 AND regexp_replace(c.phone,'\\D','','g')=regexp_replace($2,'\\D','','g') AND (o.slug=$3 OR replace(o.slug,'-','')=replace($3,'-','')) ORDER BY ac.created_at DESC LIMIT 1`,
      [hash, phone, slug],
    )
  ).rows[0];
  if (!row)
    return NextResponse.json(
      { error: "Código inválido ou expirado" },
      { status: 400 },
    );
  await query("UPDATE customer_access_codes SET used_at=now() WHERE id=$1", [
    row.id,
  ]);
  const token = await createCustomerSession({
      clientId: row.client_id,
      organizationId: row.organization_id,
      organizationSlug: row.slug,
      name: row.name,
    }),
    response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 2592000,
  });
  return response;
}
