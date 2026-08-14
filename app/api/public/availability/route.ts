import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export async function GET(req: Request) {
  try {
    const u = new URL(req.url),
      barber = u.searchParams.get("barberId"),
      service = u.searchParams.get("serviceId"),
      date = u.searchParams.get("date"),
      slug = u.searchParams.get("organization") || "navalha";
    if (!barber || !service || !date)
      return NextResponse.json(
        { error: "Parâmetros obrigatórios" },
        { status: 400 },
      );
    const svc = (
      await query<any>(
        `SELECT s.duration_minutes "durationMinutes",s.organization_id FROM services s JOIN organizations o ON o.id=s.organization_id WHERE s.id=$1 AND s.active=true AND (o.slug=$2 OR replace(o.slug,'-','')=replace($2,'-','')) AND o.status IN ('TRIAL','ACTIVE') AND o.manual_suspended=false AND EXISTS(SELECT 1 FROM barbers WHERE id=$3 AND organization_id=s.organization_id AND active=true)`,
        [service, slug, barber],
      )
    ).rows[0];
    if (!svc) return NextResponse.json([]);
    const weekday = new Date(date + "T12:00:00").getDay(),
      hours = (
        await query<any>(
          "SELECT starts_at::text,ends_at::text FROM business_hours WHERE organization_id=$1 AND barber_id=$2 AND weekday=$3 AND active=true",
          [svc.organization_id, barber, weekday],
        )
      ).rows,
      slots: {
        startsAt: string;
        status: "AVAILABLE" | "RESERVED" | "BLOCKED";
      }[] = [];
    for (const h of hours) {
      let cursor = new Date(`${date}T${h.starts_at}`),
        end = new Date(`${date}T${h.ends_at}`);
      while (cursor.getTime() + svc.durationMinutes * 60000 <= end.getTime()) {
        const finish = new Date(cursor.getTime() + svc.durationMinutes * 60000),
          appointment = await query(
            `SELECT 1 FROM appointments WHERE organization_id=$1 AND barber_id=$2 AND status<>'CANCELED' AND starts_at<$4 AND ends_at>$3 LIMIT 1`,
            [svc.organization_id, barber, cursor, finish],
          ),
          block = await query(
            `SELECT 1 FROM schedule_blocks WHERE organization_id=$1 AND (barber_id=$2 OR barber_id IS NULL) AND starts_at<$4 AND ends_at>$3 LIMIT 1`,
            [svc.organization_id, barber, cursor, finish],
          );
        if (cursor > new Date())
          slots.push({
            startsAt: cursor.toISOString(),
            status: block.rowCount
              ? "BLOCKED"
              : appointment.rowCount
                ? "RESERVED"
                : "AVAILABLE",
          });
        cursor = new Date(cursor.getTime() + 1800000);
      }
    }
    return NextResponse.json(slots);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Falha ao consultar horários" },
      { status: 500 },
    );
  }
}
