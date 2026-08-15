import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { validCpf, validPhone } from "@/lib/br-fields";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone || "");
  const cpf = String(body.cpf || "");
  const slug = String(body.organization || "navalha");
  if (!validPhone(phone) || !validCpf(cpf)) return NextResponse.json({ error: "Informe telefone e CPF válidos" }, { status: 400 });
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const identifier = createHash("sha256").update(`${phone.replace(/\D/g, "")}:${forwarded}`).digest("hex");
  const attempts = await query<{ count: number }>(
    "SELECT count(*)::int count FROM customer_login_attempts WHERE identifier_hash=$1 AND success=false AND attempted_at>now()-interval '15 minutes'",
    [identifier],
  );
  if ((attempts.rows[0]?.count || 0) >= 8) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });
  const customer = (
    await query<any>(
      `SELECT c.id,c.name,c.organization_id,o.slug FROM clients c JOIN organizations o ON o.id=c.organization_id
       WHERE regexp_replace(COALESCE(c.phone,''),'\D','','g')=regexp_replace($1,'\D','','g')
       AND regexp_replace(COALESCE(c.cpf,''),'\D','','g')=regexp_replace($2,'\D','','g')
       AND (o.slug=$3 OR replace(o.slug,'-','')=replace($3,'-','')) AND o.status IN('ACTIVE','TRIAL') AND o.manual_suspended=false
       AND c.anonymized_at IS NULL ORDER BY c.updated_at DESC LIMIT 1`,
      [phone, cpf, slug],
    )
  ).rows[0];
  await query("INSERT INTO customer_login_attempts(identifier_hash,success) VALUES($1,$2)", [identifier, Boolean(customer)]);
  if (!customer) return NextResponse.json({ error: "Dados não conferem. Verifique o telefone e o CPF cadastrados." }, { status: 401 });
  const token = await createCustomerSession({ clientId: customer.id, organizationId: customer.organization_id, organizationSlug: customer.slug, name: customer.name });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
  return response;
}
