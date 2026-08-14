import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireAdmin, requireSession } from "@/lib/http";
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const row = (
    await query(
      'SELECT inventory_sales AS "inventorySales",loyalty FROM organization_features WHERE organization_id=$1',
      [s.organizationId],
    )
  ).rows[0];
  return NextResponse.json(row || { inventorySales: false, loyalty: false });
}
const schema = z.object({
  inventorySales: z.boolean().optional(),
  loyalty: z.boolean().optional(),
});
export async function PATCH(request: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await request.json()),
      row = (
        await query(
          `INSERT INTO organization_features(organization_id,inventory_sales,loyalty,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id) DO UPDATE SET inventory_sales=COALESCE($2,organization_features.inventory_sales),loyalty=COALESCE($3,organization_features.loyalty),updated_at=now(),updated_by=$4 RETURNING inventory_sales AS "inventorySales",loyalty`,
          [
            s.organizationId,
            x.inventorySales ?? null,
            x.loyalty ?? null,
            s.sub,
          ],
        )
      ).rows[0];
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
