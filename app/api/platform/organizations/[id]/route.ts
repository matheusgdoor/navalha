import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
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
  const status = body.status ? String(body.status).toUpperCase() : null;
  const plan = body.plan ? String(body.plan).toUpperCase() : null;
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : null;
  const manualSuspended =
    typeof body.manualSuspended === "boolean" ? body.manualSuspended : null;
  const suspensionReason = String(body.suspensionReason || "").trim();
  if (
    status &&
    !["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"].includes(status)
  )
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  if (periodEnd && Number.isNaN(periodEnd.getTime()))
    return NextResponse.json({ error: "Vencimento inválido" }, { status: 400 });
  if (manualSuspended === true && suspensionReason.length < 3)
    return NextResponse.json(
      { error: "Informe o motivo da suspensão" },
      { status: 400 },
    );
  if (
    plan &&
    !(await query("SELECT 1 FROM plans WHERE code=$1 AND active=true", [plan]))
      .rowCount
  )
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  let updated;
  try {
    updated = await transaction(async (client) => {
      const before = (
        await client.query(
          "SELECT o.status,o.manual_suspended,o.suspension_reason,s.plan_code AS plan,s.current_period_end AS period_end FROM organizations o LEFT JOIN subscriptions s ON s.organization_id=o.id WHERE o.id=$1 FOR UPDATE OF o",
          [id],
        )
      ).rows[0];
      if (!before) return null;
      if (status) {
        await client.query(
          "UPDATE organizations SET status=$2,updated_at=now() WHERE id=$1",
          [id, status],
        );
        await client.query(
          "UPDATE subscriptions SET status=$2,updated_at=now() WHERE organization_id=$1",
          [id, status === "ACTIVE" ? "ACTIVE" : status],
        );
      }
      if (plan)
        await client.query(
          "UPDATE subscriptions SET plan_code=$2,updated_at=now() WHERE organization_id=$1",
          [id, plan],
        );
      if (plan)
        await client.query(
          "UPDATE organizations SET plan=$2,updated_at=now() WHERE id=$1",
          [id, plan],
        );
      if (periodEnd) {
        await client.query(
          "UPDATE subscriptions SET current_period_end=$2,updated_at=now() WHERE organization_id=$1",
          [id, periodEnd],
        );
        await client.query(
          "UPDATE organizations SET trial_ends_at=CASE WHEN status='TRIAL' THEN $2 ELSE trial_ends_at END,updated_at=now() WHERE id=$1",
          [id, periodEnd],
        );
      }
      if (manualSuspended !== null)
        await client.query(
          `UPDATE organizations SET manual_suspended=$2,suspension_reason=$3,
          manually_suspended_at=CASE WHEN $2 THEN now() ELSE NULL END,
          manually_suspended_by=CASE WHEN $2 THEN $4::uuid ELSE NULL END,
          updated_at=now() WHERE id=$1`,
          [
            id,
            manualSuspended,
            manualSuspended ? suspensionReason : null,
            session.sub,
          ],
        );
      const after = {
        status: status || before.status,
        plan: plan || before.plan,
        periodEnd: periodEnd || before.period_end,
        manualSuspended:
          manualSuspended === null ? before.manual_suspended : manualSuspended,
        suspensionReason:
          manualSuspended === null
            ? before.suspension_reason
            : manualSuspended
              ? suspensionReason
              : null,
      };
      await client.query(
        "INSERT INTO platform_audit(actor_id,organization_id,action,previous_data,new_data) VALUES($1,$2,'ORGANIZATION_UPDATED',$3,$4)",
        [session.sub, id, before, after],
      );
      return after;
    });
  } catch (error) {
    console.error("Falha ao atualizar empresa na plataforma", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a empresa",
      },
      { status: 500 },
    );
  }
  if (!updated)
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  return NextResponse.json(updated);
}
