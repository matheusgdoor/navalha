import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  name: z.string().min(2).max(120),
  priceCents: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive().max(480),
});
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(
      (
        await query(
          'SELECT id,name,price_cents AS "priceCents",duration_minutes AS "durationMinutes",active FROM services WHERE organization_id=$1 ORDER BY name',
          [s.organizationId],
        )
      ).rows,
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (s.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await req.json()),
      r = await query(
        'INSERT INTO services(organization_id,name,price_cents,duration_minutes) VALUES($1,$2,$3,$4) RETURNING id,name,price_cents AS "priceCents",duration_minutes AS "durationMinutes",active',
        [s.organizationId, x.name, x.priceCents, x.durationMinutes],
      );
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
