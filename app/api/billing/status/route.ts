import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
import { asaasConfigured } from "@/lib/asaas";
export async function GET() {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const rows = (
    await query(
      'SELECT id,requested_plan AS "requestedPlan",amount_cents AS "amountCents",status,billing_type AS "billingType",due_date AS "dueDate",paid_at AS "paidAt",checkout_url AS "checkoutUrl",pix_payload AS "pixPayload",pix_encoded_image AS "pixEncodedImage",pix_expiration_at AS "pixExpirationAt",created_at AS "createdAt" FROM billing_checkouts WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 10',
      [s.organizationId],
    )
  ).rows;
  return NextResponse.json({
    provider: "ASAAS",
    configured: asaasConfigured(),
    environment:
      process.env.ASAAS_ENVIRONMENT === "production" ? "production" : "sandbox",
    checkouts: rows,
  });
}
