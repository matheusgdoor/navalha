import { NextResponse } from "next/server";
import { transaction } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await requirePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const code = (await params).code.toUpperCase();
    const body = await request.json().catch(() => ({}));
    const values = {
      priceCents: Number(body.priceCents), barberLimit: Number(body.barberLimit),
      appointmentLimit: Number(body.appointmentLimit), whatsappLimit: Number(body.whatsappLimit),
    };
    if (!Number.isInteger(values.priceCents) || values.priceCents < 0 || values.priceCents > 10000000)
      return NextResponse.json({ error: "Mensalidade inválida" }, { status: 400 });
    if (!Number.isInteger(values.barberLimit) || values.barberLimit < 1 || values.barberLimit > 10000)
      return NextResponse.json({ error: "Limite de barbeiros inválido" }, { status: 400 });
    if (!Number.isInteger(values.appointmentLimit) || values.appointmentLimit < 1 || values.appointmentLimit > 10000000)
      return NextResponse.json({ error: "Limite de agendamentos inválido" }, { status: 400 });
    if (!Number.isInteger(values.whatsappLimit) || values.whatsappLimit < 0 || values.whatsappLimit > 10000000)
      return NextResponse.json({ error: "Franquia de WhatsApp inválida" }, { status: 400 });
    const updated = await transaction(async (client) => {
      const before = (await client.query("SELECT * FROM plans WHERE code=$1 FOR UPDATE", [code])).rows[0];
      if (!before) return null;
      const result = await client.query(`UPDATE plans SET price_cents=$2,barber_limit=$3,monthly_appointment_limit=$4,whatsapp_limit=$5
        WHERE code=$1 RETURNING code,name,price_cents AS "priceCents",barber_limit AS "barberLimit",monthly_appointment_limit AS "appointmentLimit",whatsapp_limit AS "whatsappLimit"`,
        [code, values.priceCents, values.barberLimit, values.appointmentLimit, values.whatsappLimit]);
      await client.query("INSERT INTO platform_audit(actor_id,action,previous_data,new_data) VALUES($1,'PLAN_UPDATED',$2,$3)", [session.sub, before, result.rows[0]]);
      return result.rows[0];
    });
    if (!updated) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
