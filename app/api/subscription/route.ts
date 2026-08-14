import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { requireAdmin } from "@/lib/http";
export async function GET() {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const current = await getEntitlements(s.organizationId),
    plans = (
      await query(
        'SELECT code,name,price_cents AS "priceCents",barber_limit AS "barberLimit",monthly_appointment_limit AS "appointmentLimit",whatsapp_limit AS "whatsappLimit" FROM plans WHERE active=true ORDER BY price_cents',
      )
    ).rows;
  return NextResponse.json({ current, plans });
}
