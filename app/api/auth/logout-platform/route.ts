import { NextResponse } from "next/server";
import { PLATFORM_COOKIE } from "@/lib/platform-auth";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PLATFORM_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
