import { NextResponse } from "next/server";
import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { apiError, requireAdmin } from "@/lib/http";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("OPEN"), openingCashCents: z.number().int().min(0) }),
  z.object({ action: z.literal("CLOSE"), countedCashCents: z.number().int().min(0), countedPixCents: z.number().int().min(0), countedCardCents: z.number().int().min(0), notes: z.string().max(500).optional() }),
]);

const select = `SELECT cr.id,cr.business_date::text AS "businessDate",cr.status,cr.opening_cash_cents AS "openingCashCents",
 cr.expected_cash_cents AS "expectedCashCents",cr.expected_pix_cents AS "expectedPixCents",cr.expected_card_cents AS "expectedCardCents",
 cr.counted_cash_cents AS "countedCashCents",cr.counted_pix_cents AS "countedPixCents",cr.counted_card_cents AS "countedCardCents",
 cr.difference_cents AS "differenceCents",cr.notes,cr.opened_at AS "openedAt",cr.closed_at AS "closedAt",uo.name AS "openedBy",uc.name AS "closedBy"
 FROM cash_registers cr JOIN users uo ON uo.id=cr.opened_by LEFT JOIN users uc ON uc.id=cr.closed_by`;

async function businessDate(organizationId: string) {
  const result = await query<{ date: string }>(`SELECT (now() AT TIME ZONE COALESCE((SELECT timezone FROM business_settings WHERE organization_id=$1),'America/Cuiaba'))::date::text date`, [organizationId]);
  return result.rows[0].date;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const date = await businessDate(session.organizationId);
    const history = await query(`${select} WHERE cr.organization_id=$1 ORDER BY cr.business_date DESC LIMIT 60`, [session.organizationId]);
    const current = history.rows.find((row: any) => row.businessDate === date) || null;
    if (current?.status === "OPEN") {
      const expected = await totals(session.organizationId, current.openedAt, new Date());
      current.liveExpected = expected;
    }
    return NextResponse.json({ businessDate: date, current, history: history.rows });
  } catch (error) { return apiError(error); }
}

async function totals(organizationId: string, from: Date | string, to: Date | string) {
  const result = await query<any>(
    `SELECT method,COALESCE(sum(amount),0)::int total FROM (
      SELECT p.method,p.amount_cents amount FROM payments p WHERE p.organization_id=$1 AND p.paid_at>=$2 AND p.paid_at<=$3
      UNION ALL SELECT s.payment_method method,s.total_cents amount FROM sales s WHERE s.organization_id=$1 AND s.status='PAID' AND s.created_at>=$2 AND s.created_at<=$3
    ) movements GROUP BY method`, [organizationId, from, to],
  );
  const values = { CASH: 0, PIX: 0, CARD: 0 };
  result.rows.forEach((row: any) => { values[row.method as keyof typeof values] = row.total; });
  return values;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const date = await businessDate(session.organizationId);
    if (input.action === "OPEN") {
      const opened = await query("INSERT INTO cash_registers(organization_id,business_date,opening_cash_cents,opened_by) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,business_date) DO NOTHING RETURNING id", [session.organizationId,date,input.openingCashCents,session.sub]);
      if (!opened.rowCount) return NextResponse.json({ error: "O caixa deste dia já foi aberto ou fechado" }, { status: 409 });
      return NextResponse.json({ id: opened.rows[0].id, status: "OPEN" }, { status: 201 });
    }
    const closed = await transaction(async (client) => {
      const register = await client.query<any>("SELECT * FROM cash_registers WHERE organization_id=$1 AND business_date=$2 AND status='OPEN' FOR UPDATE", [session.organizationId,date]);
      if (!register.rows[0]) throw new Error("Não existe caixa aberto para hoje");
      const expected = await totals(session.organizationId, register.rows[0].opened_at, new Date());
      const expectedCash = register.rows[0].opening_cash_cents + expected.CASH;
      const difference = input.countedCashCents + input.countedPixCents + input.countedCardCents - expectedCash - expected.PIX - expected.CARD;
      return (await client.query(`UPDATE cash_registers SET status='CLOSED',expected_cash_cents=$1,expected_pix_cents=$2,expected_card_cents=$3,
        counted_cash_cents=$4,counted_pix_cents=$5,counted_card_cents=$6,difference_cents=$7,notes=$8,closed_by=$9,closed_at=now()
        WHERE id=$10 RETURNING id,status,difference_cents AS "differenceCents"`, [expectedCash,expected.PIX,expected.CARD,input.countedCashCents,input.countedPixCents,input.countedCardCents,difference,input.notes || null,session.sub,register.rows[0].id])).rows[0];
    });
    return NextResponse.json(closed);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Valores inválidos" }, { status: 400 });
    if (error instanceof Error && error.message.includes("caixa aberto")) return NextResponse.json({ error: error.message }, { status: 409 });
    return apiError(error);
  }
}
