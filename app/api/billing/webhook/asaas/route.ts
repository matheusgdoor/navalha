import { NextResponse } from "next/server";
import { transaction } from "@/lib/db";
export async function POST(request: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN,
    received = request.headers.get("asaas-access-token");
  if (!expected || received !== expected)
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.event)
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  await transaction(async (client) => {
    const inserted = await client.query(
      "INSERT INTO billing_webhook_events(provider,event_id,event_type,payload) VALUES('ASAAS',$1,$2,$3) ON CONFLICT DO NOTHING RETURNING event_id",
      [body.id, body.event, body],
    );
    if (!inserted.rowCount) return;
    const providerId = body.payment?.id || body.checkout?.id;
    if (!providerId) return;
    const status: Record<string, string> = {
      CHECKOUT_PAID: "PAID",
      CHECKOUT_CANCELED: "CANCELED",
      CHECKOUT_EXPIRED: "EXPIRED",
      PAYMENT_RECEIVED: "PAID",
      PAYMENT_OVERDUE: "EXPIRED",
      PAYMENT_DELETED: "CANCELED",
      PAYMENT_REFUNDED: "CANCELED",
    };
    if (!status[body.event]) return;
    const isPayment = Boolean(body.payment?.id);
    const checkout = (
      await client.query(
        `UPDATE billing_checkouts SET status=$2,
          paid_at=CASE WHEN $2='PAID' THEN coalesce(paid_at,now()) ELSE paid_at END,
          updated_at=now()
         WHERE ${isPayment ? "provider_payment_id" : "provider_checkout_id"}=$1
           AND NOT ($2='PAID' AND status='PAID') RETURNING *`,
        [providerId, status[body.event]],
      )
    ).rows[0];
    if (!checkout || status[body.event] !== "PAID") return;
    await client.query(
      "UPDATE subscriptions SET plan_code=$2,status='ACTIVE',provider='ASAAS',provider_subscription_id=COALESCE($3,provider_subscription_id),current_period_start=greatest(current_period_end,now()),current_period_end=greatest(current_period_end,now())+($4||' months')::interval,updated_at=now() WHERE organization_id=$1",
      [
        checkout.organization_id,
        checkout.requested_plan,
        body.checkout?.subscription?.id || null,
        checkout.period_months || 1,
      ],
    );
    await client.query(
      "UPDATE organizations SET plan=$2,status='ACTIVE',updated_at=now() WHERE id=$1",
      [checkout.organization_id, checkout.requested_plan],
    );
    await client.query(
      "UPDATE plan_change_requests SET status='APPROVED',reviewed_at=now() WHERE organization_id=$1 AND requested_plan=$2 AND status='PENDING'",
      [checkout.organization_id, checkout.requested_plan],
    );
  });
  return NextResponse.json({ received: true });
}
