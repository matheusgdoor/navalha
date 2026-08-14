import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
import { queueMessage } from "@/lib/messages";
const schema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELED"]),
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
      const old = await c.query(
        "SELECT a.*,b.user_id FROM appointments a JOIN barbers b ON b.id=a.barber_id WHERE a.id=$1 AND a.organization_id=$2 FOR UPDATE",
        [id, s.organizationId],
      );
      if (!old.rows[0]) throw new Error("Agendamento não encontrado");
      if (s.role === "BARBER" && old.rows[0].user_id !== s.sub)
        throw new Error("Acesso negado");
      const r = await c.query(
        "UPDATE appointments SET status=$1,notes=COALESCE($2,notes) WHERE id=$3 AND organization_id=$4 RETURNING *",
        [x.status, x.notes, id, s.organizationId],
      );
      await c.query(
        "INSERT INTO appointment_audit(organization_id,appointment_id,action,previous_data,new_data,user_id) VALUES($1,$2,$3,$4,$5,$6)",
        [
          s.organizationId,
          id,
          `STATUS_${x.status}`,
          old.rows[0],
          r.rows[0],
          s.sub,
        ],
      );
      if (x.status === "CANCELED") await queueMessage(c, id, "CANCELLATION");
      if (x.status === "CONFIRMED") await queueMessage(c, id, "CONFIRMATION");
      return r.rows[0];
    });
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof Error && e.message === "Acesso negado")
      return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    return apiError(e);
  }
}
