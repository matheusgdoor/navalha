import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
import { createSecureToken } from "@/lib/secure-token";
const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "BARBER"]),
});
export async function POST(request: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await request.json());
    if (
      (
        await query(
          "SELECT 1 FROM organization_members om JOIN users u ON u.id=om.user_id WHERE om.organization_id=$1 AND lower(u.email)=lower($2)",
          [s.organizationId, x.email],
        )
      ).rowCount
    )
      return NextResponse.json(
        { error: "Este usuário já pertence à organização" },
        { status: 409 },
      );
    const { token, hash } = createSecureToken();
    await query(
      "INSERT INTO organization_invitations(organization_id,email,role,token_hash,invited_by,expires_at) VALUES($1,lower($2),$3,$4,$5,now()+interval '7 days')",
      [s.organizationId, x.email, x.role, hash, s.sub],
    );
    const origin = process.env.APP_URL || new URL(request.url).origin;
    return NextResponse.json(
      {
        message: "Convite criado",
        inviteUrl: `${origin}/aceitar-convite?token=${token}`,
      },
      { status: 201 },
    );
  } catch (e: any) {
    if (e?.code === "23505")
      return NextResponse.json(
        { error: "Já existe um convite pendente" },
        { status: 409 },
      );
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
