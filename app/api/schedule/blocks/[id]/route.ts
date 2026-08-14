import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await requireSession();
  if (!s || s.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const { id } = await params;
    const removed = await query(
      "DELETE FROM schedule_blocks WHERE id=$1 AND organization_id=$2 RETURNING id",
      [id, s.organizationId],
    );
    if (!removed.rowCount)
      return NextResponse.json(
        { error: "Bloqueio não encontrado" },
        { status: 404 },
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
