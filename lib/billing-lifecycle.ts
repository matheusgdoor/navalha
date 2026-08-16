import { transaction } from "@/lib/db";

export async function runBillingLifecycle() {
  const graceDays = Math.max(0, Math.min(30, Number(process.env.BILLING_GRACE_DAYS || 3)));
  return transaction(async (client) => {
    const pastDue = await client.query(`UPDATE subscriptions SET status='PAST_DUE',updated_at=now()
      WHERE status IN('ACTIVE','TRIAL') AND current_period_end<now()
      AND current_period_end>=now()-($1||' days')::interval RETURNING organization_id`, [graceDays]);
    if (pastDue.rowCount) await client.query("UPDATE organizations SET status='PAST_DUE',updated_at=now() WHERE id=ANY($1::uuid[])", [pastDue.rows.map((x) => x.organization_id)]);
    const suspended = await client.query(`UPDATE subscriptions SET status='SUSPENDED',updated_at=now()
      WHERE status IN('ACTIVE','TRIAL','PAST_DUE') AND current_period_end<now()-($1||' days')::interval RETURNING organization_id`, [graceDays]);
    if (suspended.rowCount) await client.query("UPDATE organizations SET status='SUSPENDED',updated_at=now() WHERE id=ANY($1::uuid[])", [suspended.rows.map((x) => x.organization_id)]);
    return { pastDue: pastDue.rowCount || 0, suspended: suspended.rowCount || 0, graceDays };
  });
}
