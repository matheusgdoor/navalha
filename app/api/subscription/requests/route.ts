import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";

export async function GET() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const result = await query(
    `SELECT r.id,r.current_plan AS "currentPlan",r.requested_plan AS "requestedPlan",
      r.status,r.notes,r.created_at AS "createdAt",r.reviewed_at AS "reviewedAt",
      p.name AS "requestedPlanName",u.name AS "reviewedBy"
     FROM plan_change_requests r
     JOIN plans p ON p.code=r.requested_plan
     LEFT JOIN users u ON u.id=r.reviewed_by
     WHERE r.organization_id=$1 ORDER BY r.created_at DESC`,
    [session.organizationId],
  );
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const requestedPlan = String(body.requestedPlan || "").toUpperCase();
  const notes =
    String(body.notes || "")
      .trim()
      .slice(0, 1000) || null;
  const plan = (
    await query("SELECT code FROM plans WHERE code=$1 AND active=true", [
      requestedPlan,
    ])
  ).rows[0];
  if (!plan)
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  const subscription = (
    await query<{ plan_code: string }>(
      "SELECT plan_code FROM subscriptions WHERE organization_id=$1",
      [session.organizationId],
    )
  ).rows[0];
  if (!subscription)
    return NextResponse.json(
      { error: "Assinatura não encontrada" },
      { status: 404 },
    );
  if (subscription.plan_code === requestedPlan)
    return NextResponse.json(
      { error: "Este já é o plano atual" },
      { status: 400 },
    );
  try {
    const result = await query(
      `INSERT INTO plan_change_requests(organization_id,requested_by,current_plan,requested_plan,notes)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id,status,created_at AS "createdAt"`,
      [
        session.organizationId,
        session.sub,
        subscription.plan_code,
        requestedPlan,
        notes,
      ],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505")
      return NextResponse.json(
        { error: "Já existe uma solicitação pendente" },
        { status: 409 },
      );
    throw error;
  }
}
