import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
import { asaasConfigured, asaasRequest } from "@/lib/asaas";

export async function POST() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  if (!asaasConfigured())
    return NextResponse.json(
      { error: "As credenciais do Asaas ainda não foram configuradas" },
      { status: 503 },
    );

  const subscription = (
    await query<any>(
      `SELECT s.plan_code,s.provider_customer_id,p.name,p.price_cents,
        bs.name AS business_name,bs.email,bs.phone,bs.document
       FROM subscriptions s JOIN plans p ON p.code=s.plan_code
       LEFT JOIN business_settings bs ON bs.organization_id=s.organization_id
       WHERE s.organization_id=$1`,
      [session.organizationId],
    )
  ).rows[0];
  if (!subscription)
    return NextResponse.json(
      { error: "Assinatura não encontrada" },
      { status: 404 },
    );
  if (!subscription.document)
    return NextResponse.json(
      {
        error:
          "Informe o CPF/CNPJ da barbearia em Administração antes de gerar o Pix",
      },
      { status: 400 },
    );

  const existing = (
    await query<any>(
      `SELECT id,provider_payment_id,pix_payload,pix_encoded_image,pix_expiration_at,
        due_date,status,amount_cents,requested_plan
       FROM billing_checkouts
       WHERE organization_id=$1 AND billing_type='PIX' AND status='PENDING'
         AND coalesce(pix_expiration_at,due_date::timestamptz+interval '1 day')>now()
       ORDER BY created_at DESC LIMIT 1`,
      [session.organizationId],
    )
  ).rows[0];
  if (existing) return NextResponse.json(mapPix(existing));

  let customerId = subscription.provider_customer_id;
  try {
    if (!customerId) {
      const customer = await asaasRequest("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: subscription.business_name || session.name,
          cpfCnpj: String(subscription.document).replace(/\D/g, ""),
          email: subscription.email || session.email,
          mobilePhone: subscription.phone
            ? String(subscription.phone).replace(/\D/g, "")
            : undefined,
          externalReference: session.organizationId,
        }),
      });
      customerId = customer.id;
      await query(
        "UPDATE subscriptions SET provider='ASAAS',provider_customer_id=$2,updated_at=now() WHERE organization_id=$1",
        [session.organizationId, customerId],
      );
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const charge = (
      await query<any>(
        `INSERT INTO billing_checkouts
          (organization_id,requested_by,requested_plan,amount_cents,billing_type,due_date)
         VALUES($1,$2,$3,$4,'PIX',$5) RETURNING id`,
        [
          session.organizationId,
          session.sub,
          subscription.plan_code,
          subscription.price_cents,
          dueDate.toISOString().slice(0, 10),
        ],
      )
    ).rows[0];
    try {
      const payment = await asaasRequest("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: subscription.price_cents / 100,
          dueDate: dueDate.toISOString().slice(0, 10),
          description: `Renovação mensal Navalha SaaS — Plano ${subscription.name}`,
          externalReference: charge.id,
        }),
      });
      const pix = await asaasRequest(`/payments/${payment.id}/pixQrCode`, {
        method: "GET",
      });
      const saved = (
        await query<any>(
          `UPDATE billing_checkouts SET provider_payment_id=$2,status='PENDING',
            checkout_url=$3,pix_payload=$4,pix_encoded_image=$5,pix_expiration_at=$6,
            updated_at=now() WHERE id=$1
           RETURNING id,provider_payment_id,pix_payload,pix_encoded_image,
             pix_expiration_at,due_date,status,amount_cents,requested_plan`,
          [
            charge.id,
            payment.id,
            payment.invoiceUrl || null,
            pix.payload,
            pix.encodedImage,
            pix.expirationDate,
          ],
        )
      ).rows[0];
      return NextResponse.json(mapPix(saved), { status: 201 });
    } catch (error) {
      await query(
        "UPDATE billing_checkouts SET status='FAILED',error_message=$2,updated_at=now() WHERE id=$1",
        [charge.id, error instanceof Error ? error.message : "Falha no Asaas"],
      );
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao gerar Pix" },
      { status: 502 },
    );
  }
}

function mapPix(row: any) {
  return {
    id: row.id,
    paymentId: row.provider_payment_id,
    payload: row.pix_payload,
    encodedImage: row.pix_encoded_image,
    expirationAt: row.pix_expiration_at,
    dueDate: row.due_date,
    status: row.status,
    amountCents: row.amount_cents,
    plan: row.requested_plan,
  };
}
