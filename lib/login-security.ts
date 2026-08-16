import { createHmac } from "crypto";
import { query } from "@/lib/db";

export type LoginScope = "BUSINESS" | "PLATFORM";
const digest = (value: string) => createHmac("sha256", process.env.AUTH_SECRET || "development-secret-change-me").update(value).digest("hex");
export function loginIdentity(request: Request, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const origin = forwarded || request.headers.get("x-real-ip") || "unknown";
  return { identifier: digest(email.trim().toLowerCase()), origin: digest(origin) };
}
export async function loginBlocked(scope: LoginScope, identity: { identifier: string; origin: string }) {
  const result = await query<any>(`SELECT
    count(*) FILTER(WHERE identifier_hash=$2 AND success=false)::int identifier_failures,
    count(*) FILTER(WHERE origin_hash=$3 AND success=false)::int origin_failures
    FROM auth_login_attempts WHERE scope=$1 AND attempted_at>now()-interval '15 minutes'`, [scope,identity.identifier,identity.origin]);
  const row = result.rows[0];
  return row.identifier_failures >= 5 || row.origin_failures >= 20;
}
export async function recordLogin(scope: LoginScope, identity: { identifier: string; origin: string }, success: boolean) {
  await query("INSERT INTO auth_login_attempts(scope,identifier_hash,origin_hash,success) VALUES($1,$2,$3,$4)", [scope,identity.identifier,identity.origin,success]);
  if (Math.random() < 0.02) await query("DELETE FROM auth_login_attempts WHERE attempted_at<now()-interval '30 days'");
}
