import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/http";

export async function GET() {
  const session = await requireSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const values = [session.organizationId, session.sub];
  await query(
    `INSERT INTO app_notifications(organization_id,user_id,source_key,type,title,message,href,created_at)
     SELECT a.organization_id,$2,'appointment-'||a.id,'APPOINTMENT','Atendimento próximo',
       c.name||' está agendado para '||to_char(a.starts_at,'DD/MM às HH24:MI'),'/app',now()
     FROM appointments a JOIN clients c ON c.id=a.client_id
     WHERE a.organization_id=$1 AND a.status IN('PENDING','CONFIRMED')
       AND a.starts_at BETWEEN now() AND now()+interval '24 hours'
     ON CONFLICT(organization_id,user_id,source_key) DO NOTHING`,
    values,
  );
  await query(
    `INSERT INTO app_notifications(organization_id,user_id,source_key,type,title,message,href,created_at)
     SELECT s.organization_id,$2,'subscription-'||to_char(s.current_period_end,'YYYY-MM-DD'),
       'BILLING',CASE WHEN s.current_period_end<now() THEN 'Assinatura vencida' ELSE 'Vencimento próximo' END,
       CASE WHEN s.current_period_end<now() THEN 'Renove por Pix para evitar a suspensão do acesso.'
            ELSE 'Sua assinatura vence em '||greatest(0,ceil(extract(epoch from(s.current_period_end-now()))/86400))::int||' dia(s).' END,
       '/assinatura',now()
     FROM subscriptions s WHERE s.organization_id=$1
       AND s.current_period_end<now()+interval '7 days'
     ON CONFLICT(organization_id,user_id,source_key) DO NOTHING`,
    values,
  );
  await query(
    `INSERT INTO app_notifications(organization_id,user_id,source_key,type,title,message,href,created_at)
     SELECT bc.organization_id,$2,'pix-paid-'||bc.id,'PAYMENT','Pagamento Pix confirmado',
       'A assinatura foi renovada com sucesso.','/assinatura',coalesce(bc.paid_at,now())
     FROM billing_checkouts bc WHERE bc.organization_id=$1 AND bc.status='PAID'
       AND bc.paid_at>now()-interval '30 days'
     ON CONFLICT(organization_id,user_id,source_key) DO NOTHING`,
    values,
  );
  await query(
    "DELETE FROM app_notifications WHERE user_id=$1 AND created_at<now()-interval '90 days'",
    [session.sub],
  );
  const rows = (
    await query(
      `SELECT id,type,title,message,href,read_at AS "readAt",created_at AS "createdAt"
       FROM app_notifications WHERE organization_id=$1 AND user_id=$2
       ORDER BY read_at NULLS FIRST,created_at DESC LIMIT 30`,
      values,
    )
  ).rows;
  return NextResponse.json({
    unread: rows.filter((item: any) => !item.readAt).length,
    notifications: rows,
  });
}

const schema = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
});
export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = schema.parse(await request.json());
    if (!body.id && !body.all)
      return NextResponse.json(
        { error: "Notificação inválida" },
        { status: 400 },
      );
    await query(
      `UPDATE app_notifications SET read_at=coalesce(read_at,now())
       WHERE organization_id=$1 AND user_id=$2 AND ($3::uuid IS NULL OR id=$3)`,
      [session.organizationId, session.sub, body.all ? null : body.id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    throw error;
  }
}
