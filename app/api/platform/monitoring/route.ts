import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";

type Alert = { id: string; severity: "CRITICAL" | "WARNING" | "INFO"; title: string; message: string; organization?: string; action: string };

export async function GET() {
  if (!(await requirePlatformAdmin())) return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const [queue, billing, cash, access, limits, requests] = await Promise.all([
      query<any>(`SELECT o.name organization,count(*)::int total,count(*) FILTER(WHERE mq.status='FAILED')::int failed,
        count(*) FILTER(WHERE mq.status IN('PENDING','RETRY') AND mq.scheduled_at<now()-interval '15 minutes')::int delayed
        FROM message_queue mq JOIN organizations o ON o.id=mq.organization_id
        WHERE mq.status='FAILED' OR (mq.status IN('PENDING','RETRY') AND mq.scheduled_at<now()-interval '15 minutes') GROUP BY o.id ORDER BY failed DESC,delayed DESC LIMIT 20`),
      query<any>(`SELECT o.name organization,count(*) FILTER(WHERE bc.status='FAILED')::int failed,count(*) FILTER(WHERE bc.status='EXPIRED' AND bc.created_at>now()-interval '30 days')::int expired
        FROM billing_checkouts bc JOIN organizations o ON o.id=bc.organization_id WHERE bc.status='FAILED' OR (bc.status='EXPIRED' AND bc.created_at>now()-interval '30 days') GROUP BY o.id LIMIT 20`),
      query<any>(`SELECT o.name organization,cr.business_date::text AS date,(current_date-cr.business_date)::int days
        FROM cash_registers cr JOIN organizations o ON o.id=cr.organization_id WHERE cr.status='OPEN' AND cr.business_date<current_date ORDER BY cr.business_date LIMIT 20`),
      query<any>(`SELECT count(*)::int failures,count(DISTINCT identifier_hash)::int identifiers FROM customer_login_attempts WHERE success=false AND attempted_at>now()-interval '15 minutes'`),
      query<any>(`SELECT o.name organization,p.monthly_appointment_limit AS "limit",count(a.id)::int used,
        round(count(a.id)*100.0/GREATEST(p.monthly_appointment_limit,1))::int percentage
        FROM organizations o JOIN subscriptions s ON s.organization_id=o.id JOIN plans p ON p.code=s.plan_code
        LEFT JOIN appointments a ON a.organization_id=o.id AND date_trunc('month',a.created_at)=date_trunc('month',now())
        WHERE o.status IN('ACTIVE','TRIAL') GROUP BY o.id,p.monthly_appointment_limit HAVING count(a.id)>=p.monthly_appointment_limit*0.8 ORDER BY percentage DESC LIMIT 20`),
      query<any>(`SELECT count(*)::int pending FROM plan_change_requests WHERE status='PENDING' AND created_at<now()-interval '48 hours'`),
    ]);
    const alerts: Alert[] = [];
    queue.rows.forEach((row: any) => alerts.push({ id: `queue-${row.organization}`, severity: row.failed ? "CRITICAL" : "WARNING", title: row.failed ? "Mensagens com falha" : "Fila de mensagens atrasada", message: `${row.failed || 0} falha(s) e ${row.delayed || 0} mensagem(ns) atrasada(s).`, organization: row.organization, action: "Verificar credenciais e processador da fila" }));
    billing.rows.forEach((row: any) => alerts.push({ id: `billing-${row.organization}`, severity: row.failed ? "CRITICAL" : "WARNING", title: "Cobranças precisam de atenção", message: `${row.failed || 0} falha(s) e ${row.expired || 0} cobrança(s) expirada(s) nos últimos 30 dias.`, organization: row.organization, action: "Revisar integração Asaas e situação da assinatura" }));
    cash.rows.forEach((row: any) => alerts.push({ id: `cash-${row.organization}`, severity: row.days > 2 ? "CRITICAL" : "WARNING", title: "Caixa permanece aberto", message: `Caixa de ${new Date(`${String(row.date).slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR")} ainda não foi fechado.`, organization: row.organization, action: "Solicitar fechamento à empresa" }));
    limits.rows.forEach((row: any) => alerts.push({ id: `limit-${row.organization}`, severity: row.percentage >= 100 ? "CRITICAL" : "WARNING", title: row.percentage >= 100 ? "Limite do plano atingido" : "Empresa próxima do limite", message: `${row.used} de ${row.limit} agendamentos utilizados (${row.percentage}%).`, organization: row.organization, action: "Avaliar upgrade de plano" }));
    if (access.rows[0]?.failures >= 8) alerts.push({ id: "access", severity: access.rows[0].failures >= 30 ? "CRITICAL" : "WARNING", title: "Tentativas suspeitas de acesso", message: `${access.rows[0].failures} falhas para ${access.rows[0].identifiers} identificador(es) nos últimos 15 minutos.`, action: "Monitorar origem e possíveis abusos" });
    if (requests.rows[0]?.pending) alerts.push({ id: "requests", severity: "INFO", title: "Solicitações aguardando análise", message: `${requests.rows[0].pending} solicitação(ões) está(ão) pendente(s) há mais de 48 horas.`, action: "Revisar solicitações de plano" });
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);
    return NextResponse.json({ checkedAt: new Date().toISOString(), summary: { critical: alerts.filter((alert) => alert.severity === "CRITICAL").length, warning: alerts.filter((alert) => alert.severity === "WARNING").length, info: alerts.filter((alert) => alert.severity === "INFO").length, healthy: alerts.length === 0 }, alerts });
  } catch (error) { return apiError(error); }
}
