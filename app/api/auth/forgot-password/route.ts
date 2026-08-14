import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { createSecureToken } from "@/lib/secure-token";
const schema = z.object({ email: z.string().email() });
export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json()),
      user = (
        await query<any>(
          "SELECT id FROM users WHERE lower(email)=lower($1) AND active=true",
          [email],
        )
      ).rows[0];
    let devUrl: string | undefined;
    if (user) {
      const { token, hash } = createSecureToken();
      await query(
        "UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
        [user.id],
      );
      await query(
        "INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",
        [user.id, hash],
      );
      if (process.env.NODE_ENV !== "production")
        devUrl = `/redefinir-senha?token=${token}`;
    }
    return NextResponse.json({
      message: "Se o e-mail estiver cadastrado, enviaremos as instruções.",
      devUrl,
    });
  } catch {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }
}
