import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { validDocument, validPhone } from "@/lib/br-fields";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";
const schema = z.object({
  businessName: z.string().min(2).max(120),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  privacyAccepted: z.union([z.literal(true), z.literal("true")]),
  phone: z
    .string()
    .refine((v) => !v || validPhone(v), "Telefone inválido")
    .optional(),
  document: z
    .string()
    .refine((v) => !v || validDocument(v), "CPF/CNPJ inválido")
    .optional(),
});
export async function POST(req: Request) {
  try {
    const x = schema.parse(await req.json()),
      hash = await bcrypt.hash(x.password, 12),
      created = await transaction(async (c) => {
        const existing = await c.query(
          "SELECT 1 FROM organizations WHERE slug=$1",
          [x.slug],
        );
        if (existing.rowCount) throw new Error("Este endereço já está em uso");
        let user = await c.query<{ id: string }>(
          "SELECT id FROM users WHERE lower(email)=lower($1)",
          [x.email],
        );
        if (user.rows[0]) throw new Error("Este e-mail já possui uma conta");
        user = await c.query(
          "INSERT INTO users(name,email,password_hash,role) VALUES($1,lower($2),$3,'ADMIN') RETURNING id",
          [x.ownerName, x.email, hash],
        );
        const org = await c.query<{ id: string; slug: string }>(
          "INSERT INTO organizations(name,slug,status,plan,trial_ends_at) VALUES($1,$2,'TRIAL','STARTER',now()+interval '14 days') RETURNING id,slug",
          [x.businessName, x.slug],
        );
        await c.query(
          "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'ADMIN')",
          [org.rows[0].id, user.rows[0].id],
        );
        await c.query(
          "INSERT INTO subscriptions(organization_id,plan_code,status,current_period_end) VALUES($1,'STARTER','TRIAL',now()+interval '14 days')",
          [org.rows[0].id],
        );
        await c.query(
          "INSERT INTO business_settings(organization_id,id,name,phone,document) VALUES($1,true,$2,$3,$4)",
          [org.rows[0].id, x.businessName, x.phone || null, x.document || null],
        );
        await c.query(
          `INSERT INTO services(organization_id,name,price_cents,duration_minutes) VALUES($1,'Corte',4000,40),($1,'Barba',3500,30),($1,'Corte + barba',7000,60)`,
          [org.rows[0].id],
        );
        await c.query(
          `INSERT INTO privacy_consents(organization_id,user_id,subject_email,purpose,legal_basis,policy_version,source)
           VALUES($1,$2,lower($3),'TERMS_AND_PRIVACY','CONSENT',$4,'BUSINESS_SIGNUP')`,
          [org.rows[0].id,user.rows[0].id,x.email,PRIVACY_POLICY_VERSION],
        );
        return {
          userId: user.rows[0].id,
          organizationId: org.rows[0].id,
          slug: org.rows[0].slug,
        };
      }),
      token = await createSession({
        sub: created.userId,
        name: x.ownerName,
        email: x.email.toLowerCase(),
        role: "ADMIN",
        organizationId: created.organizationId,
        organizationSlug: created.slug,
      }),
      res = NextResponse.json(
        {
          organization: { id: created.organizationId, slug: created.slug },
          trialDays: 14,
        },
        { status: 201 },
      );
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 28800,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dados inválidos";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("já") ? 409 : 400 },
    );
  }
}
