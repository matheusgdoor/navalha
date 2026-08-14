import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json(
      { error: "Acesso restrito à plataforma" },
      { status: 403 },
    );
  const summary = (
    await query<any>(
      `SELECT
        count(*) FILTER(WHERE bc.status='PAID' AND bc.paid_at>=date_trunc('month',now()))::int AS paid,
        count(*) FILTER(WHERE bc.status='PENDING')::int AS pending,
        count(*) FILTER(WHERE bc.status='EXPIRED')::int AS expired,
        coalesce(sum(bc.amount_cents) FILTER(WHERE bc.status='PAID' AND bc.paid_at>=date_trunc('month',now())),0)::int AS "receivedCents",
        coalesce(sum(bc.amount_cents) FILTER(WHERE bc.status='PENDING'),0)::int AS "pendingCents"
       FROM billing_checkouts bc WHERE bc.billing_type='PIX'`,
    )
  ).rows[0];
  const charges = (
    await query(
      `SELECT bc.id,o.name AS organization,o.slug,bc.requested_plan AS plan,
        bc.amount_cents AS "amountCents",bc.status,bc.due_date AS "dueDate",
        bc.paid_at AS "paidAt",bc.created_at AS "createdAt"
       FROM billing_checkouts bc JOIN organizations o ON o.id=bc.organization_id
       WHERE bc.billing_type='PIX' ORDER BY bc.created_at DESC LIMIT 100`,
    )
  ).rows;
  return NextResponse.json({ summary, charges });
}
