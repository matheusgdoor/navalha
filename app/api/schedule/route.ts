import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";
const schema = z.object({
  barberId: z.string().uuid().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(200).optional(),
});
export async function GET() {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const [h, b, q] = await Promise.all([
      query(
        "SELECT bh.*,b.name barber FROM business_hours bh JOIN barbers b ON b.id=bh.barber_id WHERE bh.organization_id=$1 ORDER BY b.name,weekday,starts_at",
        [s.organizationId],
      ),
      query(
        "SELECT sb.*,b.name barber FROM schedule_blocks sb LEFT JOIN barbers b ON b.id=sb.barber_id WHERE sb.organization_id=$1 AND ends_at>now() ORDER BY starts_at",
        [s.organizationId],
      ),
      query(
        "SELECT mq.*,c.name client FROM message_queue mq JOIN appointments a ON a.id=mq.appointment_id JOIN clients c ON c.id=a.client_id WHERE mq.organization_id=$1 ORDER BY mq.created_at DESC LIMIT 50",
        [s.organizationId],
      ),
    ]);
    return NextResponse.json({
      hours: h.rows,
      blocks: b.rows,
      messages: q.rows,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await req.json());
    if (
      x.barberId &&
      !(
        await query(
          "SELECT 1 FROM barbers WHERE id=$1 AND organization_id=$2",
          [x.barberId, s.organizationId],
        )
      ).rowCount
    )
      return NextResponse.json({ error: "Barbeiro inválido" }, { status: 400 });
    const r = await query(
      "INSERT INTO schedule_blocks(organization_id,barber_id,starts_at,ends_at,reason,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        s.organizationId,
        x.barberId || null,
        x.startsAt,
        x.endsAt,
        x.reason || null,
        s.sub,
      ],
    );
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return apiError(e);
  }
}
