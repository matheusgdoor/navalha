import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";
const schema = z.object({
  barberId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean(),
});
export async function PUT(req: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await req.json());
    if (x.endsAt <= x.startsAt)
      return NextResponse.json({ error: "Período inválido" }, { status: 400 });
    const row = await transaction(async (c) => {
      if (
        !(
          await c.query(
            "SELECT 1 FROM barbers WHERE id=$1 AND organization_id=$2",
            [x.barberId, s.organizationId],
          )
        ).rowCount
      )
        throw new Error("Barbeiro inválido");
      await c.query(
        "DELETE FROM business_hours WHERE organization_id=$1 AND barber_id=$2 AND weekday=$3",
        [s.organizationId, x.barberId, x.weekday],
      );
      return (
        await c.query(
          "INSERT INTO business_hours(organization_id,barber_id,weekday,starts_at,ends_at,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
          [
            s.organizationId,
            x.barberId,
            x.weekday,
            x.startsAt,
            x.endsAt,
            x.active,
          ],
        )
      ).rows[0];
    });
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return apiError(e);
  }
}
