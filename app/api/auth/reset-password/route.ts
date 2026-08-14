import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { hashToken } from "@/lib/secure-token";
const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).max(100),
});
export async function POST(request: Request) {
  try {
    const x = schema.parse(await request.json()),
      ok = await transaction(async (c) => {
        const row = (
          await c.query<any>(
            "SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
            [hashToken(x.token)],
          )
        ).rows[0];
        if (!row) return false;
        await c.query(
          "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
          [await bcrypt.hash(x.password, 12), row.user_id],
        );
        await c.query(
          "UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
          [row.user_id],
        );
        return true;
      });
    return ok
      ? NextResponse.json({ message: "Senha redefinida" })
      : NextResponse.json(
          { error: "Link inválido ou expirado" },
          { status: 400 },
        );
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
