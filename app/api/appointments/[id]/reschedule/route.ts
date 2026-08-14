import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
const schema = z.object({
  startsAt: z.string().datetime(),
  barberId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params,
      x = schema.parse(await req.json());
    const row = await transaction(async (c) => {
      const old = await c.query<any>(
        "SELECT a.*,s.duration_minutes,b.user_id FROM appointments a JOIN services s ON s.id=a.service_id JOIN barbers b ON b.id=a.barber_id WHERE a.id=$1 AND a.organization_id=$2 FOR UPDATE",
        [id, s.organizationId],
      );
      if (!old.rows[0]) throw new Error("Agendamento não encontrado");
      if (s.role === "BARBER" && old.rows[0].user_id !== s.sub)
        throw new Error("Acesso negado");
      const barber =
          s.role === "BARBER"
            ? old.rows[0].barber_id
            : x.barberId || old.rows[0].barber_id,
        end = new Date(
          new Date(x.startsAt).getTime() + old.rows[0].duration_minutes * 60000,
        ),
        conflict = await c.query(
          "SELECT 1 FROM appointments WHERE id<>$1 AND barber_id=$2 AND organization_id=$5 AND status<>'CANCELED' AND starts_at<$4 AND ends_at>$3",
          [id, barber, x.startsAt, end, s.organizationId],
        );
      if (conflict.rowCount)
        throw new Error("Este barbeiro já possui atendimento nesse período");
      const updated = (
        await c.query(
          "UPDATE appointments SET starts_at=$1,ends_at=$2,barber_id=$3,notes=COALESCE($4,notes),status='CONFIRMED' WHERE id=$5 AND organization_id=$6 RETURNING *",
          [x.startsAt, end, barber, x.notes, id, s.organizationId],
        )
      ).rows[0];
      await c.query(
        "INSERT INTO appointment_audit(organization_id,appointment_id,action,previous_data,new_data,user_id) VALUES($1,$2,$3,$4,$5,$6)",
        [s.organizationId, id, "RESCHEDULED", old.rows[0], updated, s.sub],
      );
      return updated;
    });
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof Error && e.message === "Acesso negado")
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    if (
      (e as { code?: string })?.code === "23P01" ||
      (e instanceof Error && e.message.includes("já possui"))
    )
      return NextResponse.json(
        { error: "Este barbeiro já possui atendimento nesse período" },
        { status: 409 },
      );
    return apiError(e);
  }
}
