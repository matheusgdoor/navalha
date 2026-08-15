import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const result = await query(
      `SELECT code,name,price_cents AS "priceCents",barber_limit AS "barberLimit",
       monthly_appointment_limit AS "appointmentLimit",whatsapp_limit AS "whatsappLimit"
       FROM plans WHERE active=true ORDER BY price_cents`,
    );
    return NextResponse.json({ plans: result.rows });
  } catch (error) {
    return apiError(error);
  }
}
