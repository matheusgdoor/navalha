import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { queueMessage } from "@/lib/messages";
import { validCpf, validPhone } from "@/lib/br-fields";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";
const schema = z.object({
  name: z.string().min(2),
  phone: z.string().refine(validPhone, "Telefone inválido"),
  cpf: z
    .string()
    .refine((v) => !v || validCpf(v), "CPF inválido")
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
  organization: z.string().default("navalha"),
  privacyAccepted: z.literal(true),
});
export async function POST(req: Request) {
  try {
    const x = schema.parse(await req.json()),
      requestKey = z.string().uuid().parse(req.headers.get("idempotency-key")),
      result = await transaction(async (c) => {
        const org = (
          await c.query<any>(
            "SELECT id FROM organizations WHERE (slug=$1 OR replace(slug,'-','')=replace($1,'-','')) AND status IN ('TRIAL','ACTIVE') AND manual_suspended=false LIMIT 1",
            [x.organization],
          )
        ).rows[0];
        if (!org) throw new Error("Barbearia indisponível");
        const previous = (
          await c.query<{ id: string }>(
            "SELECT id FROM appointments WHERE organization_id=$1 AND public_request_key=$2",
            [org.id, requestKey],
          )
        ).rows[0];
        if (previous) return { id: previous.id, repeated: true };
        const quota = await c.query<any>(
          `SELECT p.monthly_appointment_limit lim,(SELECT count(*)::int FROM appointments WHERE organization_id=$1 AND date_trunc('month',created_at)=date_trunc('month',now())) used FROM subscriptions s JOIN plans p ON p.code=s.plan_code WHERE s.organization_id=$1`,
          [org.id],
        );
        if (!quota.rows[0] || quota.rows[0].used >= quota.rows[0].lim)
          throw new Error("Limite mensal de agendamentos atingido");
        const s = await c.query<{ duration_minutes: number }>(
          "SELECT duration_minutes FROM services WHERE id=$1 AND organization_id=$2 AND active=true AND EXISTS(SELECT 1 FROM barbers WHERE id=$3 AND organization_id=$2 AND active=true)",
          [x.serviceId, org.id, x.barberId],
        );
        if (!s.rows[0]) throw new Error("Serviço indisponível");
        const end = new Date(
            new Date(x.startsAt).getTime() + s.rows[0].duration_minutes * 60000,
          ),
          conflict = await c.query(
            `SELECT 1 FROM appointments WHERE organization_id=$1 AND barber_id=$2 AND status<>'CANCELED' AND starts_at<$4 AND ends_at>$3 UNION ALL SELECT 1 FROM schedule_blocks WHERE organization_id=$1 AND (barber_id=$2 OR barber_id IS NULL) AND starts_at<$4 AND ends_at>$3 LIMIT 1`,
            [org.id, x.barberId, x.startsAt, end],
          );
        if (conflict.rowCount) throw new Error("Horário indisponível");
        let client = await c.query<{ id: string }>(
          "SELECT id FROM clients WHERE organization_id=$1 AND phone=$2 ORDER BY created_at LIMIT 1",
          [org.id, x.phone],
        );
        if (!client.rows[0])
          client = await c.query(
            "INSERT INTO clients(organization_id,name,phone,cpf,email) VALUES($1,$2,$3,$4,$5) RETURNING id",
            [org.id, x.name, x.phone, x.cpf || null, x.email || null],
          );
        else
          await c.query(
            "UPDATE clients SET name=$1,cpf=COALESCE($2,cpf),email=COALESCE($3,email),updated_at=now() WHERE id=$4 AND organization_id=$5",
            [x.name, x.cpf || null, x.email || null, client.rows[0].id, org.id],
          );
        await c.query(
          `INSERT INTO privacy_consents(organization_id,client_id,subject_email,purpose,legal_basis,policy_version,source)
           VALUES($1,$2,$3,'APPOINTMENT_AND_SERVICE','CONSENT',$4,'PUBLIC_BOOKING')`,
          [org.id,client.rows[0].id,x.email || null,PRIVACY_POLICY_VERSION],
        );
        const a = await c.query<{ id: string }>(
          "INSERT INTO appointments(organization_id,client_id,barber_id,service_id,starts_at,ends_at,status,public_request_key) VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7) RETURNING id",
          [
            org.id,
            client.rows[0].id,
            x.barberId,
            x.serviceId,
            x.startsAt,
            end,
            requestKey,
          ],
        );
        await queueMessage(c, a.rows[0].id, "CONFIRMATION");
        await queueMessage(c, a.rows[0].id, "REMINDER");
        return { id: a.rows[0].id, repeated: false };
      });
    return NextResponse.json(
      { id: result.id, message: "Agendamento solicitado com sucesso" },
      { status: result.repeated ? 200 : 201 },
    );
  } catch (e) {
    const databaseCode = (e as { code?: string })?.code;
    const msg =
      databaseCode === "23P01"
        ? "Este horário acabou de ser reservado. Escolha outro horário."
        : e instanceof Error
          ? e.message
          : "Dados inválidos";
    return NextResponse.json(
      { error: msg },
      {
        status:
          databaseCode === "23P01" || msg.includes("indisponível") ? 409 : 400,
      },
    );
  }
}
