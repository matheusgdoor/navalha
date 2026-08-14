import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  commissionPercent: z.number().min(0).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  active: z.boolean(),
  password: z.string().min(8).optional().or(z.literal("")),
});
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const { id } = await params,
      x = schema.parse(await req.json());
    const row = await transaction(async (c) => {
      const current = await c.query<{ user_id: string | null }>(
        "SELECT user_id FROM barbers WHERE id=$1 AND organization_id=$2 FOR UPDATE",
        [id, session.organizationId],
      );
      if (!current.rows[0]) throw new Error("Barbeiro não encontrado");
      const userId = current.rows[0].user_id;
      if (userId) {
        await c.query(
          "UPDATE users SET name=$1,email=COALESCE(NULLIF(lower($2),''),email),active=$3,updated_at=now() WHERE id=$4",
          [x.name, x.email, x.active, userId],
        );
        if (x.password)
          await c.query(
            "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
            [await bcrypt.hash(x.password, 12), userId],
          );
      } else if (x.email && x.password) {
        const u = await c.query<{ id: string }>(
          "INSERT INTO users(name,email,password_hash,role,active) VALUES($1,lower($2),$3,'BARBER',$4) RETURNING id",
          [x.name, x.email, await bcrypt.hash(x.password, 12), x.active],
        );
        await c.query(
          "UPDATE barbers SET user_id=$1 WHERE id=$2 AND organization_id=$3",
          [u.rows[0].id, id, session.organizationId],
        );
      }
      return (
        await c.query(
          'UPDATE barbers SET name=$1,phone=$2,commission_percent=$3,color=$4,active=$5 WHERE id=$6 AND organization_id=$7 RETURNING id,name,phone,commission_percent AS "commissionPercent",color,active,user_id AS "userId"',
          [
            x.name,
            x.phone || null,
            x.commissionPercent,
            x.color,
            x.active,
            id,
            session.organizationId,
          ],
        )
      ).rows[0];
    });
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    if (e instanceof Error && e.message.includes("duplicate key"))
      return NextResponse.json(
        { error: "Este e-mail já está em uso" },
        { status: 409 },
      );
    return apiError(e);
  }
}
