import { NextResponse } from "next/server";
import { runBillingLifecycle } from "@/lib/billing-lifecycle";

export async function POST(request: Request) {
  if (
    !process.env.QUEUE_SECRET ||
    request.headers.get("authorization") !==
      `Bearer ${process.env.QUEUE_SECRET}`
  )
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const result = await runBillingLifecycle();
  return NextResponse.json(result);
}
