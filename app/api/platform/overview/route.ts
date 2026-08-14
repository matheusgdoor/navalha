import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-auth";
export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json(
      { error: "Acesso restrito à plataforma" },
      { status: 403 },
    );
  const summary = (
    await query<any>(
      `SELECT count(*)::int organizations,count(*) FILTER(WHERE o.status='ACTIVE')::int active,count(*) FILTER(WHERE o.status='TRIAL')::int trials,count(*) FILTER(WHERE o.status IN('PAST_DUE','SUSPENDED') OR s.current_period_end<now())::int risk,count(*) FILTER(WHERE s.current_period_end>=now() AND s.current_period_end<now()+interval '7 days')::int AS "dueSoon",count(*) FILTER(WHERE s.current_period_end<now())::int AS expired,COALESCE(sum(p.price_cents) FILTER(WHERE s.status='ACTIVE' AND s.current_period_end>=now()),0)::int AS "mrrCents" FROM organizations o LEFT JOIN subscriptions s ON s.organization_id=o.id LEFT JOIN plans p ON p.code=s.plan_code`,
    )
  ).rows[0];
  const plans = (
    await query(
      `SELECT p.code,p.name,p.price_cents AS "priceCents",count(s.organization_id)::int organizations FROM plans p LEFT JOIN subscriptions s ON s.plan_code=p.code GROUP BY p.code,p.name,p.price_cents ORDER BY p.price_cents`,
    )
  ).rows;
  const activity = (
    await query(
      `SELECT to_char(days.day,'DD/MM') label,count(a.id)::int appointments FROM generate_series(current_date-interval '6 days',current_date,interval '1 day') days(day) LEFT JOIN appointments a ON a.starts_at>=days.day AND a.starts_at<days.day+interval '1 day' GROUP BY days.day ORDER BY days.day`,
    )
  ).rows;
  const revenue = (
    await query<any>(
      `SELECT COALESCE(sum(amount_cents),0)::int AS "servicesCents" FROM payments WHERE paid_at>=date_trunc('month',now())`,
    )
  ).rows[0];
  return NextResponse.json({
    summary: { ...summary, serviceRevenueCents: revenue.servicesCents },
    plans,
    activity,
  });
}
