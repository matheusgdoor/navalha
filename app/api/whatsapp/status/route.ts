import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/http";
import { whatsappConfigured } from "@/lib/whatsapp";
export async function GET() {
  if (!(await requireSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const counts = (
    await query(
      "SELECT status,count(*)::int total FROM message_queue GROUP BY status",
    )
  ).rows;
  return NextResponse.json({
    enabled: process.env.WHATSAPP_ENABLED === "true",
    configured: whatsappConfigured(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? true : false,
    appSecret: process.env.WHATSAPP_APP_SECRET ? true : false,
    counts,
  });
}
