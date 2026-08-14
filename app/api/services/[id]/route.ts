import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  name: z.string().min(2).max(120),
  priceCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive().max(480),
  active: z.boolean().optional(),
});
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const { id } = await params;
    const x = schema.parse(await req.json());
    const r = await query(
      'UPDATE services SET name=$1,price_cents=$2,duration_minutes=$3,active=COALESCE($4,active) WHERE id=$5 AND organization_id=$6 RETURNING id,name,price_cents AS "priceCents",duration_minutes AS "durationMinutes",active',
      [
        x.name,
        x.priceCents,
        x.durationMinutes,
        x.active,
        id,
        session.organizationId,
      ],
    );
    return NextResponse.json(r.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
