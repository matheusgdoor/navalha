import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
const schema = z.object({
  quantity: z
    .number()
    .int()
    .refine((x) => x !== 0),
  type: z.enum(["ENTRY", "ADJUSTMENT"]),
  notes: z.string().max(300).optional(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await request.json()),
      { id } = await params,
      row = await transaction(async (c) => {
        const p = (
          await c.query<any>(
            "SELECT stock FROM products WHERE id=$1 AND organization_id=$2 FOR UPDATE",
            [id, s.organizationId],
          )
        ).rows[0];
        if (!p) throw new Error("Produto não encontrado");
        const next =
          x.type === "ENTRY"
            ? p.stock + Math.abs(x.quantity)
            : p.stock + x.quantity;
        if (next < 0) throw new Error("Estoque não pode ficar negativo");
        await c.query(
          "UPDATE products SET stock=$2,updated_at=now() WHERE id=$1",
          [id, next],
        );
        await c.query(
          "INSERT INTO stock_movements(organization_id,product_id,type,quantity,notes,created_by) VALUES($1,$2,$3,$4,$5,$6)",
          [
            s.organizationId,
            id,
            x.type,
            x.type === "ENTRY" ? Math.abs(x.quantity) : x.quantity,
            x.notes || null,
            s.sub,
          ],
        );
        return { stock: next };
      });
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Dados inválidos" },
      { status: 400 },
    );
  }
}
