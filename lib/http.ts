import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { query } from "./db";
export async function requireSession() {
  const session = await getSession();
  if (!session) return null;
  const active = await query(
    "SELECT 1 FROM organizations WHERE id=$1 AND manual_suspended=false AND status NOT IN('SUSPENDED','CANCELED')",
    [session.organizationId],
  );
  return active.rowCount ? session : null;
}
export async function requireAdmin() {
  const session = await requireSession();
  return session?.role === "ADMIN" ? session : null;
}
export function apiError(error: unknown) {
  console.error(error);
  const message = error instanceof Error ? error.message : "Erro interno";
  return NextResponse.json({ error: message }, { status: 500 });
}
