import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { apiError, requireAdmin, requireSession } from "@/lib/http";
import { validDocument, validPhone } from "@/lib/br-fields";
const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z
    .string()
    .refine((v) => !v || validPhone(v), "Telefone inválido")
    .optional(),
  document: z
    .string()
    .refine((v) => !v || validDocument(v), "CPF/CNPJ inválido")
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  publicDescription: z.string().max(240).optional(),
  instagram: z
    .string()
    .max(80)
    .regex(/^@?[a-zA-Z0-9._]*$/, "Instagram inválido")
    .optional(),
  timezone: z.string().min(3).max(60),
  cancellationNoticeHours: z.coerce.number().int().min(0).max(168).default(2),
});
export async function GET() {
  const s = await requireSession();
  if (!s)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(
      (
        await query(
          'SELECT name,phone,document,email,address,public_description AS "publicDescription",instagram,timezone,currency,cancellation_notice_hours AS "cancellationNoticeHours",updated_at AS "updatedAt" FROM business_settings WHERE organization_id=$1',
          [s.organizationId],
        )
      ).rows[0],
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: Request) {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  try {
    const x = schema.parse(await req.json()),
      r = await query(
        'UPDATE business_settings SET name=$1,phone=$2,document=$3,email=$4,address=$5,public_description=$6,instagram=$7,timezone=$8,cancellation_notice_hours=$9,updated_at=now(),updated_by=$10 WHERE organization_id=$11 RETURNING name,phone,document,email,address,public_description AS "publicDescription",instagram,timezone,currency,cancellation_notice_hours AS "cancellationNoticeHours"',
        [
          x.name,
          x.phone || null,
          x.document || null,
          x.email || null,
          x.address || null,
          x.publicDescription || null,
          x.instagram ? x.instagram.replace(/^@/, "") : null,
          x.timezone,
          x.cancellationNoticeHours,
          s.sub,
          s.organizationId,
        ],
      );
    await query("UPDATE organizations SET name=$1 WHERE id=$2", [
      x.name,
      s.organizationId,
    ]);
    return NextResponse.json(r.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return apiError(e);
  }
}
