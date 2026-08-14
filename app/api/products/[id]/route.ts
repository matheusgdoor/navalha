import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";

const schema = z.object({
  name: z.string().min(2).max(150),
  sku: z.string().max(80).optional(),
  salePriceCents: z.number().int().min(0),
  costPriceCents: z.number().int().min(0),
  minStock: z.number().int().min(0),
  active: z.boolean(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const { id } = await params;
    const product = (
      await query(
        `UPDATE products SET name=$1,sku=NULLIF($2,''),sale_price_cents=$3,
          cost_price_cents=$4,min_stock=$5,active=$6,updated_at=now()
         WHERE id=$7 AND organization_id=$8
         RETURNING id,name,sku,sale_price_cents AS "salePriceCents",
           cost_price_cents AS "costPriceCents",stock,min_stock AS "minStock",active`,
        [
          body.name,
          body.sku || "",
          body.salePriceCents,
          body.costPriceCents,
          body.minStock,
          body.active,
          id,
          session.organizationId,
        ],
      )
    ).rows[0];
    if (!product)
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      );
    return NextResponse.json(product);
  } catch (error: any) {
    const duplicate = error?.code === "23505";
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return NextResponse.json(
      {
        error: duplicate
          ? "Este SKU já pertence a outro produto"
          : error?.message || "Não foi possível atualizar o produto",
      },
      { status: duplicate ? 409 : 400 },
    );
  }
}
