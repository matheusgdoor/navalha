import { NextResponse } from "next/server";
import { transaction } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformAdmin();
  if (!session)
    return NextResponse.json(
      { error: "Acesso restrito à plataforma" },
      { status: 403 },
    );
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision = String(body.decision || "").toUpperCase();
  if (!["APPROVED", "REJECTED"].includes(decision))
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });
  const result = await transaction(async (client) => {
    const row = (
      await client.query(
        "SELECT * FROM plan_change_requests WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!row || row.status !== "PENDING") return null;
    if (decision === "APPROVED") {
      await client.query(
        "UPDATE subscriptions SET plan_code=$2,status='ACTIVE',updated_at=now() WHERE organization_id=$1",
        [row.organization_id, row.requested_plan],
      );
      await client.query(
        "UPDATE organizations SET status='ACTIVE',plan=$2,updated_at=now() WHERE id=$1",
        [row.organization_id, row.requested_plan],
      );
    }
    const updated = (
      await client.query(
        "UPDATE plan_change_requests SET status=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1 RETURNING *",
        [id, decision, session.sub],
      )
    ).rows[0];
    await client.query(
      "INSERT INTO platform_audit(actor_id,organization_id,action,previous_data,new_data) VALUES($1,$2,$3,$4,$5)",
      [
        session.sub,
        row.organization_id,
        `PLAN_REQUEST_${decision}`,
        row,
        updated,
      ],
    );
    return updated;
  });
  if (!result)
    return NextResponse.json(
      { error: "Solicitação não encontrada ou já analisada" },
      { status: 409 },
    );
  return NextResponse.json(result);
}
