import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { createPlatformSession, PLATFORM_COOKIE } from "@/lib/platform-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = (
      await query<any>(
        `SELECT u.id,u.name,u.email,u.password_hash FROM users u
         JOIN platform_admins pa ON pa.user_id=u.id
         WHERE lower(u.email)=lower($1) AND u.active=true LIMIT 1`,
        [body.email],
      )
    ).rows[0];
    if (!user || !(await bcrypt.compare(body.password, user.password_hash)))
      return NextResponse.json(
        { error: "Credenciais da plataforma inválidas" },
        { status: 401 },
      );
    const token = await createPlatformSession({
      sub: user.id,
      name: user.name,
      email: user.email,
      scope: "PLATFORM",
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(PLATFORM_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 14400,
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return NextResponse.json(
      { error: "Não foi possível acessar a plataforma" },
      { status: 503 },
    );
  }
}
