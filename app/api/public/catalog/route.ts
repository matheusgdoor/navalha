import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("organization") || "navalha",
      org = (
        await query<any>(
          "SELECT id,name,slug FROM organizations WHERE (slug=$1 OR replace(slug,'-','')=replace($1,'-','')) AND status IN ('TRIAL','ACTIVE') AND manual_suspended=false ORDER BY CASE WHEN slug=$1 THEN 0 ELSE 1 END LIMIT 1",
          [slug],
        )
      ).rows[0];
    if (!org)
      return NextResponse.json(
        { error: "Barbearia não encontrada" },
        { status: 404 },
      );
    const [s, b] = await Promise.all([
      query(
        'SELECT id,name,price_cents AS "priceCents",duration_minutes AS "durationMinutes" FROM services WHERE organization_id=$1 AND active=true ORDER BY name',
        [org.id],
      ),
      query(
        "SELECT id,name,color FROM barbers WHERE organization_id=$1 AND active=true ORDER BY name",
        [org.id],
      ),
    ]);
    return NextResponse.json({
      organization: { name: org.name, slug: org.slug },
      services: s.rows,
      barbers: b.rows,
    });
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível" },
      { status: 503 },
    );
  }
}
