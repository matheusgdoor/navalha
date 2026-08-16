import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { runBillingLifecycle } from "@/lib/billing-lifecycle";

export async function GET() {
  if (!(await requirePlatformAdmin())) return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const counts = (await query<any>(`SELECT count(*) FILTER(WHERE s.current_period_end<now() AND s.current_period_end>=now()-($1||' days')::interval)::int "inGrace",
      count(*) FILTER(WHERE s.current_period_end<now()-($1||' days')::interval)::int overdue,
      count(*) FILTER(WHERE s.status='SUSPENDED')::int suspended FROM subscriptions s`, [Math.max(0, Math.min(30, Number(process.env.BILLING_GRACE_DAYS || 3)))])).rows[0];
    const last = (await query<any>("SELECT new_data AS result,created_at AS \"createdAt\" FROM platform_audit WHERE action='BILLING_LIFECYCLE_RUN' ORDER BY created_at DESC LIMIT 1")).rows[0] || null;
    return NextResponse.json({ ...counts, graceDays: Math.max(0, Math.min(30, Number(process.env.BILLING_GRACE_DAYS || 3))), last });
  } catch (error) { return apiError(error); }
}

export async function POST() {
  const session = await requirePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const result = await runBillingLifecycle();
    await query("INSERT INTO platform_audit(actor_id,action,new_data) VALUES($1,'BILLING_LIFECYCLE_RUN',$2)", [session.sub, result]);
    return NextResponse.json(result);
  } catch (error) { return apiError(error); }
}
