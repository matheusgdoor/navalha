import { NextResponse } from "next/server";
import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { requireSession } from "@/lib/http";
const schema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  method: z.enum(["CASH", "PIX", "CARD"]),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const rows = (
    await query(
      `SELECT s.id,s.total_cents AS "totalCents",s.payment_method AS method,s.status,s.created_at AS "createdAt",COALESCE(c.name,'Consumidor') client,(SELECT count(*)::int FROM sale_items i WHERE i.sale_id=s.id) items FROM sales s LEFT JOIN clients c ON c.id=s.client_id WHERE s.organization_id=$1 ORDER BY s.created_at DESC LIMIT 100`,
      [s.organizationId],
    )
  ).rows;
  return NextResponse.json(rows);
}
export async function POST(request: Request) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const x = schema.parse(await request.json()),
      sale = await transaction(async (c) => {
        if (x.clientId) {
          const client = await c.query(
            "SELECT 1 FROM clients WHERE id=$1 AND organization_id=$2",
            [x.clientId, s.organizationId],
          );
          if (!client.rowCount) throw new Error("Cliente não encontrado");
        }
        let total = 0;
        const products = [];
        for (const item of x.items) {
          const p = (
            await c.query<any>(
              "SELECT id,name,stock,sale_price_cents,cost_price_cents FROM products WHERE id=$1 AND organization_id=$2 AND active=true FOR UPDATE",
              [item.productId, s.organizationId],
            )
          ).rows[0];
          if (!p) throw new Error("Produto não encontrado");
          if (p.stock < item.quantity)
            throw new Error(`Estoque insuficiente para ${p.name}`);
          total += p.sale_price_cents * item.quantity;
          products.push({ ...p, quantity: item.quantity });
        }
        const sale = (
          await c.query<any>(
            'INSERT INTO sales(organization_id,client_id,total_cents,payment_method,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,total_cents AS "totalCents"',
            [s.organizationId, x.clientId || null, total, x.method, s.sub],
          )
        ).rows[0];
        for (const p of products) {
          await c.query(
            "INSERT INTO sale_items(sale_id,product_id,quantity,unit_price_cents,cost_price_cents) VALUES($1,$2,$3,$4,$5)",
            [sale.id, p.id, p.quantity, p.sale_price_cents, p.cost_price_cents],
          );
          await c.query(
            "UPDATE products SET stock=stock-$2,updated_at=now() WHERE id=$1",
            [p.id, p.quantity],
          );
          await c.query(
            "INSERT INTO stock_movements(organization_id,product_id,type,quantity,reference_id,notes,created_by) VALUES($1,$2,'SALE',$3,$4,'Venda no balcão',$5)",
            [s.organizationId, p.id, -p.quantity, sale.id, s.sub],
          );
        }
        return sale;
      });
    return NextResponse.json(sale, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e instanceof z.ZodError ? "Dados inválidos" : e.message },
      { status: 400 },
    );
  }
}
