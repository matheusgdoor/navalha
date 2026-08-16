import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json(
      { status: "ok", database: "connected", timestamp: new Date().toISOString(), version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 8) || "local" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "disconnected" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
