import { query } from "./db";
import type { Session } from "./auth";
export async function getEntitlements(organizationId: string) {
  return (
    await query<any>(
      `SELECT o.id,o.name,o.slug,o.status,o.trial_ends_at AS "trialEndsAt",p.code plan,p.name "planName",p.price_cents AS "priceCents",p.barber_limit AS "barberLimit",p.monthly_appointment_limit AS "appointmentLimit",p.whatsapp_limit AS "whatsappLimit",s.status AS "subscriptionStatus",s.current_period_start AS "periodStart",s.current_period_end AS "periodEnd",s.provider,(extract(epoch from (s.current_period_end-now()))/86400)::int AS "daysRemaining",(SELECT count(*)::int FROM barbers WHERE organization_id=o.id AND active=true) "barbersUsed",(SELECT count(*)::int FROM appointments WHERE organization_id=o.id AND date_trunc('month',created_at)=date_trunc('month',now())) "appointmentsUsed",(SELECT count(*)::int FROM message_queue WHERE organization_id=o.id AND date_trunc('month',created_at)=date_trunc('month',now())) "whatsappUsed" FROM organizations o JOIN subscriptions s ON s.organization_id=o.id JOIN plans p ON p.code=s.plan_code WHERE o.id=$1`,
      [organizationId],
    )
  ).rows[0];
}
export async function requireEntitlement(
  s: Session,
  type: "barber" | "appointment" | "whatsapp",
) {
  const e = await getEntitlements(s.organizationId);
  if (!e) throw new Error("Assinatura não encontrada");
  if (["SUSPENDED", "CANCELED"].includes(e.status))
    throw new Error("Assinatura inativa");
  if (type === "barber" && e.barbersUsed >= e.barberLimit)
    throw new Error(`Limite de ${e.barberLimit} barbeiros atingido`);
  if (type === "appointment" && e.appointmentsUsed >= e.appointmentLimit)
    throw new Error(
      `Limite mensal de ${e.appointmentLimit} agendamentos atingido`,
    );
  if (type === "whatsapp" && e.whatsappUsed >= e.whatsappLimit)
    throw new Error("Limite mensal de WhatsApp atingido");
  return e;
}
