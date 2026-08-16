import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requirePlatformAdmin } from "@/lib/platform-auth";

const categories = ["SUPPORT", "COMMERCIAL", "FINANCIAL", "SECURITY"];

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlatformAdmin())) return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const { id } = await params;
    const result = await query(`SELECT n.id,n.category,n.note,n.created_at AS "createdAt",u.name author
      FROM platform_organization_notes n JOIN users u ON u.id=n.author_id
      WHERE n.organization_id=$1 ORDER BY n.created_at DESC LIMIT 50`, [id]);
    return NextResponse.json({ notes: result.rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlatformAdmin();
  if (!session) return NextResponse.json({ error: "Acesso restrito à plataforma" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const note = String(body.note || "").trim();
    const category = String(body.category || "SUPPORT").toUpperCase();
    if (note.length < 3 || note.length > 2000) return NextResponse.json({ error: "A anotação deve ter entre 3 e 2.000 caracteres" }, { status: 400 });
    if (!categories.includes(category)) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    const created = await transaction(async (client) => {
      const organization = await client.query("SELECT 1 FROM organizations WHERE id=$1", [id]);
      if (!organization.rowCount) return null;
      const result = await client.query(`INSERT INTO platform_organization_notes(organization_id,author_id,category,note)
        VALUES($1,$2,$3,$4) RETURNING id,category,note,created_at AS "createdAt"`, [id, session.sub, category, note]);
      await client.query("INSERT INTO platform_audit(actor_id,organization_id,action,new_data) VALUES($1,$2,'SUPPORT_NOTE_CREATED',$3)", [session.sub, id, { category }]);
      return { ...result.rows[0], author: session.name };
    });
    if (!created) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
