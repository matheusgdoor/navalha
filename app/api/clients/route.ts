import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, requireSession } from "@/lib/http";
import { validCpf, validPhone } from "@/lib/br-fields";
const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z
    .string()
    .refine((v) => !v || validPhone(v), "Telefone inválido")
    .optional(),
  cpf: z
    .string()
    .refine((v) => !v || validCpf(v), "CPF inválido")
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});
export async function GET(req: Request) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const q = new URL(req.url).searchParams.get("q") || "",
      r = await query(
        "SELECT * FROM clients WHERE organization_id=$1 AND (name ILIKE $2 OR phone ILIKE $2) ORDER BY name",
        [s.organizationId, "%" + q + "%"],
      );
    return NextResponse.json(r.rows);
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const x = schema.parse(await req.json()),
      r = await query(
        "INSERT INTO clients(organization_id,name,phone,cpf,email,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          s.organizationId,
          x.name,
          x.phone || null,
          x.cpf || null,
          x.email || null,
          x.notes || null,
        ],
      );
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
