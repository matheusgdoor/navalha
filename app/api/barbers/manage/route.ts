import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transaction, query } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";
import { requireEntitlement } from "@/lib/entitlements";
const schema = z.object({
  name: z.string().min(2),
  phone: z.string().max(30).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  commissionPercent: z.number().min(0).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#637c68"),
});
export async function GET() {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    return NextResponse.json(
      (
        await query(
          'SELECT b.id,b.name,b.phone,b.commission_percent AS "commissionPercent",b.color,b.active,u.email FROM barbers b LEFT JOIN users u ON u.id=b.user_id WHERE b.organization_id=$1 ORDER BY b.name',
          [s.organizationId],
        )
      ).rows,
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    await requireEntitlement(s, "barber");
    const x = schema.parse(await req.json()),
      hash = await bcrypt.hash(x.password, 12),
      row = await transaction(async (c) => {
        let u = await c.query<{ id: string }>(
          "SELECT id FROM users WHERE lower(email)=lower($1)",
          [x.email],
        );
        if (!u.rows[0])
          u = await c.query(
            "INSERT INTO users(name,email,password_hash,role) VALUES($1,lower($2),$3,'BARBER') RETURNING id",
            [x.name, x.email, hash],
          );
        else if (
          (
            await c.query(
              "SELECT 1 FROM organization_members WHERE organization_id=$1 AND user_id=$2",
              [s.organizationId, u.rows[0].id],
            )
          ).rowCount
        )
          throw new Error("Este e-mail já pertence à equipe");
        await c.query(
          "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'BARBER')",
          [s.organizationId, u.rows[0].id],
        );
        return (
          await c.query(
            "INSERT INTO barbers(organization_id,user_id,name,phone,commission_percent,color) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
            [
              s.organizationId,
              u.rows[0].id,
              x.name,
              x.phone || null,
              x.commissionPercent,
              x.color,
            ],
          )
        ).rows[0];
      });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
