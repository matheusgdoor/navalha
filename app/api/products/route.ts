import { NextResponse } from "next/server";
import { z } from "zod";
import { query, transaction } from "@/lib/db";
import { requireAdmin, requireSession } from "@/lib/http";
const schema = z.object({
  name: z.string().min(2),
  sku: z.string().max(80).optional(),
  salePriceCents: z.number().int().min(0),
  costPriceCents: z.number().int().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
});
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(
    (
      await query(
        'SELECT id,name,sku,sale_price_cents AS "salePriceCents",cost_price_cents AS "costPriceCents",stock,min_stock AS "minStock",active FROM products WHERE organization_id=$1 ORDER BY active DESC,name',
        [s.organizationId],
      )
    ).rows,
  );
}
export async function POST(request: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await request.json()),
      row = await transaction(async (c) => {
        const p = (
          await c.query<any>(
            'INSERT INTO products(organization_id,name,sku,sale_price_cents,cost_price_cents,stock,min_stock) VALUES($1,$2,NULLIF($3,\'\'),$4,$5,$6,$7) RETURNING id,name,sku,sale_price_cents AS "salePriceCents",cost_price_cents AS "costPriceCents",stock,min_stock AS "minStock",active',
            [
              s.organizationId,
              x.name,
              x.sku || "",
              x.salePriceCents,
              x.costPriceCents,
              x.stock,
              x.minStock,
            ],
          )
        ).rows[0];
        if (x.stock)
          await c.query(
            "INSERT INTO stock_movements(organization_id,product_id,type,quantity,notes,created_by) VALUES($1,$2,'ENTRY',$3,'Estoque inicial',$4)",
            [s.organizationId, p.id, x.stock, s.sub],
          );
        return p;
      });
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    const duplicate = e?.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "Este SKU já pertence a outro produto"
          : "Dados inválidos",
      },
      { status: duplicate ? 409 : 400 },
    );
  }
}
