import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
import { asaasConfigured, asaasRequest } from "@/lib/asaas";

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  if (!asaasConfigured()) return NextResponse.json({ error: "As credenciais do Asaas ainda não foram configuradas" }, { status: 503 });
  const subscription = (await query<any>(`SELECT s.plan_code,s.provider_customer_id,p.name,p.price_cents,
    bs.name business_name,bs.email,bs.phone,bs.document FROM subscriptions s JOIN plans p ON p.code=s.plan_code
    LEFT JOIN business_settings bs ON bs.organization_id=s.organization_id WHERE s.organization_id=$1`, [session.organizationId])).rows[0];
  if (!subscription) return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
  if (!subscription.document) return NextResponse.json({ error: "Informe o CPF/CNPJ da barbearia em Administração antes de gerar o boleto" }, { status: 400 });
  const existing = (await query<any>(`SELECT id,provider_payment_id,checkout_url,due_date,status,amount_cents,requested_plan
    FROM billing_checkouts WHERE organization_id=$1 AND billing_type='BOLETO' AND status='PENDING' AND due_date>=current_date
    ORDER BY created_at DESC LIMIT 1`, [session.organizationId])).rows[0];
  if (existing) return NextResponse.json(mapBoleto(existing));
  let customerId = subscription.provider_customer_id;
  try {
    if (!customerId) {
      const customer = await asaasRequest("/customers", { method: "POST", body: JSON.stringify({ name: subscription.business_name || session.name, cpfCnpj: String(subscription.document).replace(/\D/g, ""), email: subscription.email || session.email, mobilePhone: subscription.phone ? String(subscription.phone).replace(/\D/g, "") : undefined, externalReference: session.organizationId }) });
      customerId = customer.id;
      await query("UPDATE subscriptions SET provider='ASAAS',provider_customer_id=$2,updated_at=now() WHERE organization_id=$1", [session.organizationId, customerId]);
    }
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 3);
    const charge = (await query<any>(`INSERT INTO billing_checkouts(organization_id,requested_by,requested_plan,amount_cents,billing_type,due_date)
      VALUES($1,$2,$3,$4,'BOLETO',$5) RETURNING id`, [session.organizationId,session.sub,subscription.plan_code,subscription.price_cents,dueDate.toISOString().slice(0,10)])).rows[0];
    try {
      const payment = await asaasRequest("/payments", { method: "POST", body: JSON.stringify({ customer: customerId, billingType: "BOLETO", value: subscription.price_cents/100, dueDate: dueDate.toISOString().slice(0,10), description: `Renovação mensal Navalha SaaS — Plano ${subscription.name}`, externalReference: charge.id }) });
      const saved = (await query<any>(`UPDATE billing_checkouts SET provider_payment_id=$2,status='PENDING',checkout_url=$3,updated_at=now() WHERE id=$1
        RETURNING id,provider_payment_id,checkout_url,due_date,status,amount_cents,requested_plan`, [charge.id,payment.id,payment.bankSlipUrl || payment.invoiceUrl || null])).rows[0];
      return NextResponse.json(mapBoleto(saved), { status: 201 });
    } catch (error) {
      await query("UPDATE billing_checkouts SET status='FAILED',error_message=$2,updated_at=now() WHERE id=$1", [charge.id,error instanceof Error ? error.message : "Falha no Asaas"]); throw error;
    }
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao gerar boleto" }, { status: 502 }); }
}
function mapBoleto(row: any) { return { id:row.id,paymentId:row.provider_payment_id,url:row.checkout_url,dueDate:row.due_date,status:row.status,amountCents:row.amount_cents,plan:row.requested_plan }; }
