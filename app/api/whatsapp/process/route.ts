import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendWhatsApp, whatsappConfigured } from "@/lib/whatsapp";
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.QUEUE_SECRET}`)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!whatsappConfigured())
    return NextResponse.json(
      { error: "WhatsApp ainda não configurado" },
      { status: 503 },
    );
  const jobs = (
    await query<any>(
      `UPDATE message_queue SET status='PROCESSING',attempts=attempts+1 WHERE id IN (SELECT id FROM message_queue WHERE status IN ('PENDING','RETRY') AND scheduled_at<=now() AND attempts<5 ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT 20) RETURNING *`,
    )
  ).rows;
  let sent = 0,
    failed = 0;
  for (const job of jobs) {
    try {
      const externalId = await sendWhatsApp(
        job.event,
        job.recipient,
        job.payload,
      );
      await query(
        "UPDATE message_queue SET status='SENT',sent_at=now(),last_error=NULL,payload=payload||jsonb_build_object('externalId',$2::text) WHERE id=$1",
        [job.id, externalId],
      );
      sent++;
    } catch (e) {
      await query(
        "UPDATE message_queue SET status=CASE WHEN attempts>=5 THEN 'FAILED' ELSE 'RETRY' END,last_error=$2,scheduled_at=now()+interval '5 minutes' WHERE id=$1",
        [job.id, e instanceof Error ? e.message : "Erro desconhecido"],
      );
      failed++;
    }
  }
  return NextResponse.json({ processed: jobs.length, sent, failed });
}
