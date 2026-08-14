import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/http";
const schema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});
export async function PATCH(req: Request) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const x = schema.parse(await req.json()),
      r = await query<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE id=$1",
        [s.sub],
      );
    if (
      !r.rows[0] ||
      !(await bcrypt.compare(x.currentPassword, r.rows[0].password_hash))
    )
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 },
      );
    await query(
      "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2",
      [await bcrypt.hash(x.newPassword, 12), s.sub],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
