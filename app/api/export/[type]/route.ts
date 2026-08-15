import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const { type } = await params,
    u = new URL(req.url),
    from = u.searchParams.get("from"),
    to = u.searchParams.get("to");
  let headers: string[] = [],
    rows: unknown[][] = [];
  if (type === "clientes") {
    headers = ["Nome", "Telefone", "E-mail", "Cadastro"];
    rows = (
      await query<any>(
        "SELECT name,phone,email,created_at FROM clients WHERE organization_id=$1 ORDER BY name",
        [session.organizationId],
      )
    ).rows.map((x) => [x.name, x.phone, x.email, x.created_at]);
  } else if (type === "agenda") {
    headers = ["Data", "Cliente", "Serviço", "Barbeiro", "Status", "Valor"];
    const r = await query<any>(
      `SELECT a.starts_at,c.name client,s.name service,b.name barber,a.status,s.price_cents FROM appointments a JOIN clients c ON c.id=a.client_id JOIN services s ON s.id=a.service_id JOIN barbers b ON b.id=a.barber_id WHERE a.organization_id=$1 AND ($2::date IS NULL OR a.starts_at >= $2::date) AND ($3::date IS NULL OR a.starts_at < $3::date+interval '1 day') ORDER BY a.starts_at`,
      [session.organizationId,from, to],
    );
    rows = r.rows.map((x) => [
      x.starts_at,
      x.client,
      x.service,
      x.barber,
      x.status,
      (x.price_cents / 100).toFixed(2),
    ]);
  } else if (type === "financeiro") {
    headers = ["Pagamento", "Cliente", "Serviço", "Barbeiro", "Forma", "Valor"];
    const r = await query<any>(
      `SELECT p.paid_at,c.name client,s.name service,b.name barber,p.method,p.amount_cents FROM payments p JOIN appointments a ON a.id=p.appointment_id JOIN clients c ON c.id=a.client_id JOIN services s ON s.id=a.service_id JOIN barbers b ON b.id=a.barber_id WHERE p.organization_id=$1 AND ($2::date IS NULL OR p.paid_at >= $2::date) AND ($3::date IS NULL OR p.paid_at < $3::date+interval '1 day') ORDER BY p.paid_at`,
      [session.organizationId,from, to],
    );
    rows = r.rows.map((x) => [
      x.paid_at,
      x.client,
      x.service,
      x.barber,
      x.method,
      (x.amount_cents / 100).toFixed(2),
    ]);
  } else
    return NextResponse.json({ error: "Exportação inválida" }, { status: 404 });
  const csv =
    "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="navalha-${type}.csv"`,
    },
  });
}
