import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { hashToken } from "@/lib/secure-token";
const schema = z.object({
  token: z.string().min(32),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(100),
});
export async function POST(request: Request) {
  try {
    const x = schema.parse(await request.json()),
      result = await transaction(async (c) => {
        const inv = (
          await c.query<any>(
            "SELECT * FROM organization_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND canceled_at IS NULL AND expires_at>now() FOR UPDATE",
            [hashToken(x.token)],
          )
        ).rows[0];
        if (!inv) return null;
        let user = (
          await c.query<any>(
            "SELECT id FROM users WHERE lower(email)=lower($1)",
            [inv.email],
          )
        ).rows[0];
        if (!user)
          user = (
            await c.query(
              "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id",
              [x.name, inv.email, await bcrypt.hash(x.password, 12), inv.role],
            )
          ).rows[0];
        await c.query(
          "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(organization_id,user_id) DO UPDATE SET active=true,role=excluded.role",
          [inv.organization_id, user.id, inv.role],
        );
        if (inv.role === "BARBER")
          await c.query(
            "INSERT INTO barbers(organization_id,user_id,name,commission_percent,color) VALUES($1,$2,$3,0,'#637c68') ON CONFLICT DO NOTHING",
            [inv.organization_id, user.id, x.name],
          );
        await c.query(
          "UPDATE organization_invitations SET accepted_at=now() WHERE id=$1",
          [inv.id],
        );
        return true;
      });
    return result
      ? NextResponse.json({ message: "Convite aceito" })
      : NextResponse.json(
          { error: "Convite inválido ou expirado" },
          { status: 400 },
        );
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
