import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result =
      await query(`SELECT o.name,o.slug,bs.address,bs.phone,bs.public_description AS description,bs.instagram,
      (SELECT count(*)::int FROM barbers b WHERE b.organization_id=o.id AND b.active=true) AS barbers,
      (SELECT count(*)::int FROM services s WHERE s.organization_id=o.id AND s.active=true) AS services
      FROM organizations o LEFT JOIN business_settings bs ON bs.organization_id=o.id
      WHERE o.status IN('TRIAL','ACTIVE') AND COALESCE(o.manual_suspended,false)=false
      ORDER BY o.name`);
    return NextResponse.json(
      { organizations: result.rows },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar as barbearias" },
      { status: 503 },
    );
  }
}
