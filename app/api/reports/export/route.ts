import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, apiError } from "@/lib/http";
import { createSimplePdf, type PdfLine } from "@/lib/simple-pdf";

const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const date = (value: unknown) => new Date(String(value)).toLocaleString("pt-BR", { timeZone: "America/Cuiaba" });
const wrap = (text: string, limit = 92) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > limit && current) {
      lines.push(current);
      current = word;
    } else current = `${current} ${word}`.trim();
  }
  if (current) lines.push(current);
  return lines;
};

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
    const from = url.searchParams.get("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const barberId = url.searchParams.get("barberId") || null;
    const [organization, payments, totals] = await Promise.all([
      query<{ name: string }>("SELECT name FROM organizations WHERE id=$1", [session.organizationId]),
      query<any>(`SELECT p.paid_at,c.name client,sv.name service,b.name barber,p.method,p.amount_cents,b.commission_percent,round(p.amount_cents*b.commission_percent/100)::int commission_cents
        FROM payments p JOIN appointments a ON a.id=p.appointment_id JOIN clients c ON c.id=a.client_id JOIN services sv ON sv.id=a.service_id JOIN barbers b ON b.id=a.barber_id
        WHERE p.organization_id=$1 AND p.paid_at >= $2::date AND p.paid_at < $3::date+interval '1 day' AND ($4::uuid IS NULL OR b.id=$4)
        ORDER BY p.paid_at`, [session.organizationId, from, to, barberId]),
      query<any>(`SELECT b.name,b.commission_percent,count(p.id)::int services,COALESCE(sum(p.amount_cents),0)::int revenue,round(COALESCE(sum(p.amount_cents),0)*b.commission_percent/100)::int commission
        FROM barbers b LEFT JOIN appointments a ON a.barber_id=b.id AND a.organization_id=$1 LEFT JOIN payments p ON p.appointment_id=a.id AND p.organization_id=$1 AND p.paid_at >= $2::date AND p.paid_at < $3::date+interval '1 day'
        WHERE b.organization_id=$1 AND ($4::uuid IS NULL OR b.id=$4) GROUP BY b.id ORDER BY revenue DESC`, [session.organizationId, from, to, barberId]),
    ]);
    const revenue = totals.rows.reduce((sum: number, row: any) => sum + row.revenue, 0);
    const commissions = totals.rows.reduce((sum: number, row: any) => sum + row.commission, 0);
    const filename = `relatorio-financeiro-${from}-${to}.${format}`;

    if (format === "csv") {
      const headers = ["Pagamento", "Cliente", "Serviço", "Barbeiro", "Forma", "Valor", "Comissão (%)", "Comissão"];
      const rows = payments.rows.map((row: any) => [date(row.paid_at), row.client, row.service, row.barber, row.method, (row.amount_cents / 100).toFixed(2), row.commission_percent, (row.commission_cents / 100).toFixed(2)]);
      const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(esc).join(";")).join("\r\n");
      return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
    }

    const lines: PdfLine[] = [
      { text: organization.rows[0]?.name || "Barbearia", bold: true, size: 13 },
      { text: `Período: ${new Date(`${from}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${to}T12:00:00`).toLocaleDateString("pt-BR")}` },
      { text: `Receita total: ${money(revenue)} | Comissões: ${money(commissions)} | Líquido estimado: ${money(revenue - commissions)}`, bold: true, gap: 12 },
      { text: "RESUMO POR BARBEIRO", bold: true, size: 12 },
      ...totals.rows.map((row: any) => ({ text: `${row.name} | ${row.services} atend. | Receita ${money(row.revenue)} | ${row.commission_percent}% | Comissão ${money(row.commission)}` })),
      { text: "DETALHAMENTO FINANCEIRO", bold: true, size: 12, gap: 8 },
      ...payments.rows.flatMap((row: any) => wrap(`${date(row.paid_at)} | ${row.barber} | ${row.client} | ${row.service} | ${row.method} | ${money(row.amount_cents)} | Com. ${money(row.commission_cents)}`).map((text) => ({ text, size: 9 }))),
      { text: `Emitido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Cuiaba" })}`, gap: 8 },
    ];
    const pdf = createSimplePdf("RELATÓRIO FINANCEIRO E DE COMISSÕES", lines);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
