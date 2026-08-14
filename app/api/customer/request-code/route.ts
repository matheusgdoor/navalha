import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { query } from "@/lib/db";
import { validPhone } from "@/lib/br-fields";
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})),
    phone = String(body.phone || ""),
    slug = String(body.organization || "navalha");
  if (!validPhone(phone))
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  const client = (
    await query<any>(
      `SELECT c.id,c.name,c.organization_id,o.slug FROM clients c JOIN organizations o ON o.id=c.organization_id WHERE replace(replace(replace(replace(c.phone,'(',''),')',''),'-',''),' ','')=regexp_replace($1,'\\D','','g') AND (o.slug=$2 OR replace(o.slug,'-','')=replace($2,'-','')) AND o.status IN('ACTIVE','TRIAL') AND o.manual_suspended=false ORDER BY c.updated_at DESC LIMIT 1`,
      [phone, slug],
    )
  ).rows[0];
  if (!client)
    return NextResponse.json(
      { error: "Cliente não encontrado nesta barbearia" },
      { status: 404 },
    );
  const code = String(randomInt(100000, 999999)),
    hash = createHash("sha256").update(code).digest("hex");
  await query(
    "UPDATE customer_access_codes SET used_at=now() WHERE client_id=$1 AND used_at IS NULL",
    [client.id],
  );
  await query(
    "INSERT INTO customer_access_codes(organization_id,client_id,code_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",
    [client.organization_id, client.id, hash],
  );
  return NextResponse.json({
    message: "Código enviado para seu WhatsApp.",
    devCode: process.env.NODE_ENV !== "production" ? code : undefined,
  });
}
