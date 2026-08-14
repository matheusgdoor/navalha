import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";

const schema = z.object({ startsAt: z.coerce.date() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCustomerSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id } = await params;
    const { startsAt } = schema.parse(await request.json());
    const appointment = (
      await query<any>(
        `SELECT a.id,a.barber_id,a.service_id,a.starts_at,s.duration_minutes,
          coalesce(bs.cancellation_notice_hours,2) notice_hours,
          coalesce(bs.timezone,'America/Cuiaba') timezone
         FROM appointments a
         JOIN services s ON s.id=a.service_id
         LEFT JOIN business_settings bs ON bs.organization_id=a.organization_id
         WHERE a.id=$1 AND a.client_id=$2 AND a.organization_id=$3
           AND a.status IN ('PENDING','CONFIRMED')`,
        [id, session.clientId, session.organizationId],
      )
    ).rows[0];
    if (!appointment)
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 },
      );

    const minimum = Number(appointment.notice_hours);
    if (
      new Date(appointment.starts_at).getTime() <=
        Date.now() + minimum * 3600000 ||
      startsAt.getTime() <= Date.now() + minimum * 3600000
    )
      return NextResponse.json(
        {
          error: `O reagendamento deve ser feito com pelo menos ${minimum}h de antecedência`,
        },
        { status: 409 },
      );

    const endsAt = new Date(
      startsAt.getTime() + Number(appointment.duration_minutes) * 60000,
    );
    const available = (
      await query(
        `SELECT 1
         WHERE EXISTS (
           SELECT 1 FROM business_hours bh
           WHERE bh.organization_id=$1 AND bh.barber_id=$2 AND bh.active=true
             AND bh.weekday=extract(dow from ($3::timestamptz AT TIME ZONE $6))
             AND bh.starts_at<=($3::timestamptz AT TIME ZONE $6)::time
             AND bh.ends_at>=($4::timestamptz AT TIME ZONE $6)::time
         )
         AND NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.organization_id=$1 AND a.barber_id=$2 AND a.id<>$5
             AND a.status<>'CANCELED' AND a.starts_at<$4 AND a.ends_at>$3
         )
         AND NOT EXISTS (
           SELECT 1 FROM schedule_blocks sb
           WHERE sb.organization_id=$1 AND (sb.barber_id=$2 OR sb.barber_id IS NULL)
             AND sb.starts_at<$4 AND sb.ends_at>$3
         )`,
        [
          session.organizationId,
          appointment.barber_id,
          startsAt,
          endsAt,
          id,
          appointment.timezone,
        ],
      )
    ).rowCount;
    if (!available)
      return NextResponse.json(
        { error: "Este horário não está mais disponível" },
        { status: 409 },
      );

    const updated = (
      await query(
        `UPDATE appointments SET starts_at=$1,ends_at=$2,status='PENDING',
          notes=concat_ws(E'\n',notes,'Reagendado pelo cliente no portal')
         WHERE id=$3 AND client_id=$4 AND organization_id=$5
         RETURNING id,starts_at AS "startsAt",ends_at AS "endsAt",status`,
        [startsAt, endsAt, id, session.clientId, session.organizationId],
      )
    ).rows[0];
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Selecione um novo horário válido" },
        { status: 400 },
      );
    if ((error as { code?: string })?.code === "23P01")
      return NextResponse.json(
        { error: "Este horário acabou de ser reservado. Escolha outro." },
        { status: 409 },
      );
    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível reagendar agora" },
      { status: 500 },
    );
  }
}
