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
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const { id } = await params,
      x = schema.parse(await req.json());
    const r = await query(
      "UPDATE clients SET name=$1,phone=$2,cpf=$3,email=$4,notes=$5,updated_at=now() WHERE id=$6 AND organization_id=$7 RETURNING *",
      [
        x.name,
        x.phone || null,
        x.cpf || null,
        x.email || null,
        x.notes || null,
        id,
        session.organizationId,
      ],
    );
    return NextResponse.json(r.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
