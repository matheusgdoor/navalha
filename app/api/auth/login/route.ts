import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { loginBlocked, loginIdentity, recordLogin } from "@/lib/login-security";
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organization: z.string().optional(),
});
export async function POST(req: Request) {
  try {
    const x = schema.parse(await req.json()),
      identity = loginIdentity(req, x.email),
      blocked = await loginBlocked("BUSINESS", identity);
    if (blocked) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429, headers: { "Retry-After": "900" } });
    const
      r = await query<any>(
        `SELECT u.id,u.name,u.email,u.password_hash,om.role,o.id organization_id,o.slug organization_slug,o.status,o.manual_suspended FROM users u JOIN organization_members om ON om.user_id=u.id AND om.active=true JOIN organizations o ON o.id=om.organization_id WHERE lower(u.email)=lower($1) AND u.active=true AND ($2::text IS NULL OR o.slug=$2) ORDER BY o.created_at LIMIT 1`,
        [x.email, x.organization || null],
      ),
      u = r.rows[0];
    if (!u || !(await bcrypt.compare(x.password, u.password_hash))) {
      await recordLogin("BUSINESS", identity, false);
      return NextResponse.json(
        { error: "E-mail ou senha inválidos" },
        { status: 401 },
      );
    }
    if (u.manual_suspended || ["SUSPENDED", "CANCELED"].includes(u.status))
      return NextResponse.json(
        { error: "Esta assinatura está inativa" },
        { status: 403 },
      );
    await recordLogin("BUSINESS", identity, true);
    const token = await createSession({
        sub: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationId: u.organization_id,
        organizationSlug: u.organization_slug,
      }),
      res = NextResponse.json({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          organizationId: u.organization_id,
        },
      });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 28800,
    });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json(
        { error: "Dados de acesso inválidos" },
        { status: 400 },
      );
    console.error(e);
    return NextResponse.json(
      { error: "Não foi possível acessar o sistema" },
      { status: 503 },
    );
  }
}
