import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";

const safe = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const result = await query<any>(`SELECT o.name,o.slug,o.status,o.manual_suspended,p.name plan,
      p.price_cents,s.status subscription_status,s.current_period_end,
      (SELECT count(*)::int FROM barbers b WHERE b.organization_id=o.id AND b.active=true) barbers,
      (SELECT count(*)::int FROM clients c WHERE c.organization_id=o.id) clients,
      (SELECT count(*)::int FROM appointments a WHERE a.organization_id=o.id AND date_trunc('month',a.starts_at)=date_trunc('month',now())) appointments,
      (SELECT COALESCE(sum(pay.amount_cents),0)::int FROM payments pay WHERE pay.organization_id=o.id AND date_trunc('month',pay.paid_at)=date_trunc('month',now())) revenue
      FROM organizations o LEFT JOIN subscriptions s ON s.organization_id=o.id
      LEFT JOIN plans p ON p.code=s.plan_code ORDER BY o.name`);
    const headers = ["Empresa","Identificador","Status da empresa","Suspensão manual","Plano","Mensalidade","Status da assinatura","Vencimento","Barbeiros","Clientes","Agendamentos no mês","Faturamento da barbearia no mês"];
    const rows = result.rows.map((row: any) => [row.name,row.slug,row.status,row.manual_suspended ? "Sim" : "Não",row.plan,(row.price_cents/100).toFixed(2),row.subscription_status,row.current_period_end ? new Date(row.current_period_end).toLocaleDateString("pt-BR",{timeZone:"America/Cuiaba"}) : "",row.barbers,row.clients,row.appointments,(row.revenue/100).toFixed(2)]);
    const csv = "\uFEFF" + [headers,...rows].map((row) => row.map(safe).join(";")).join("\r\n");
    const date = new Date().toISOString().slice(0,10);
    return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="navalha-saas-empresas-${date}.csv"`,"Cache-Control":"no-store"}});
  } catch (error) {
    return apiError(error);
  }
}
