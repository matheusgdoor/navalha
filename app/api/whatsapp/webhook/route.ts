import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyMetaSignature } from "@/lib/whatsapp";
export async function GET(req: Request) {
  const u = new URL(req.url),
    mode = u.searchParams.get("hub.mode"),
    token = u.searchParams.get("hub.verify_token"),
    challenge = u.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN)
    return new NextResponse(challenge, { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256")))
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  const body = JSON.parse(raw);
  for (const entry of body.entry || [])
    for (const change of entry.changes || [])
      for (const s of change.value?.statuses || []) {
        const status = String(s.status).toUpperCase();
        await query(
          "UPDATE message_queue SET status=$1,last_error=CASE WHEN $1='FAILED' THEN $3 ELSE last_error END WHERE payload->>'externalId'=$2",
          [status, s.id, s.errors?.[0]?.title || null],
        );
      }
  return NextResponse.json({ received: true });
}
