import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const { id } = await params,
    body = await request.json(),
    active = Boolean(body.active);
  if (id === s.sub && !active)
    return NextResponse.json(
      { error: "Você não pode desativar o próprio acesso" },
      { status: 400 },
    );
  const row = (
    await query(
      "UPDATE organization_members SET active=$3 WHERE organization_id=$1 AND user_id=$2 RETURNING user_id",
      [s.organizationId, id, active],
    )
  ).rows[0];
  if (!row)
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 },
    );
  return NextResponse.json({ active });
}
