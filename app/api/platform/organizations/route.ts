import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json(
      { error: "Acesso restrito à plataforma" },
      { status: 403 },
    );
  const result = await query(`
    SELECT o.id,o.name,o.slug,o.status,o.manual_suspended AS "manualSuspended",o.suspension_reason AS "suspensionReason",o.manually_suspended_at AS "manuallySuspendedAt",o.created_at AS "createdAt",
      s.plan_code AS plan,p.name AS "planName",p.price_cents AS "priceCents",s.status AS "subscriptionStatus",s.current_period_start AS "periodStart",s.current_period_end AS "periodEnd",o.trial_ends_at AS "trialEndsAt",s.provider,(extract(epoch from (s.current_period_end-now()))/86400)::int AS "daysRemaining",
      (SELECT count(*)::int FROM organization_members m WHERE m.organization_id=o.id AND m.active=true) AS members,
      (SELECT count(*)::int FROM barbers b WHERE b.organization_id=o.id AND b.active=true) AS barbers,
      (SELECT count(*)::int FROM clients c WHERE c.organization_id=o.id) AS clients,
      (SELECT count(*)::int FROM appointments a WHERE a.organization_id=o.id AND date_trunc('month',a.starts_at)=date_trunc('month',now())) AS "appointmentsMonth",
      (SELECT max(a.starts_at) FROM appointments a WHERE a.organization_id=o.id) AS "lastActivity",
      (SELECT COALESCE(sum(pay.amount_cents),0)::int FROM payments pay WHERE pay.organization_id=o.id AND date_trunc('month',pay.paid_at)=date_trunc('month',now())) AS "serviceRevenueCents",
      (SELECT count(*)::int FROM plan_change_requests r WHERE r.organization_id=o.id AND r.status='PENDING') AS "pendingRequests"
    FROM organizations o LEFT JOIN subscriptions s ON s.organization_id=o.id
    LEFT JOIN plans p ON p.code=s.plan_code ORDER BY o.created_at DESC`);
  return NextResponse.json(result.rows);
}
