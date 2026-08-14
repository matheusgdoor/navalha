import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/http";

export async function POST() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  return NextResponse.json(
    {
      error:
        "Checkout por cartão desativado. Utilize a renovação mensal por Pix.",
    },
    { status: 410 },
  );
}
