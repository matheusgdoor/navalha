import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/http";
export async function GET() {
  const s = await requireAdmin();
  if (!s)
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  const row = (
    await query<any>(
      `SELECT
 (SELECT count(*)::int FROM services WHERE organization_id=$1 AND active=true) services,
 (SELECT count(*)::int FROM barbers WHERE organization_id=$1 AND active=true) barbers,
 (SELECT count(*)::int FROM business_hours WHERE organization_id=$1 AND active=true) hours,
 (SELECT count(*)::int FROM appointments WHERE organization_id=$1) appointments,
 (SELECT count(*)::int FROM clients WHERE organization_id=$1) clients,
 (SELECT CASE WHEN phone IS NOT NULL AND address IS NOT NULL THEN 1 ELSE 0 END FROM business_settings WHERE organization_id=$1)::int profile`,
      [s.organizationId],
    )
  ).rows[0];
  const tasks = [
    {
      key: "profile",
      label: "Complete os dados da barbearia",
      description: "Telefone, endereço e fuso horário.",
      done: Boolean(row.profile),
      action: "settings",
    },
    {
      key: "services",
      label: "Cadastre seus serviços",
      description: "Defina preços e duração dos atendimentos.",
      done: row.services > 0,
      action: "services",
    },
    {
      key: "team",
      label: "Organize sua equipe",
      description: "Adicione barbeiros e acessos individuais.",
      done: row.barbers > 0,
      action: "team",
    },
    {
      key: "hours",
      label: "Configure os horários",
      description: "Informe quando sua barbearia atende.",
      done: row.hours > 0,
      action: "availability",
    },
    {
      key: "appointment",
      label: "Registre o primeiro agendamento",
      description: "Teste o fluxo completo da agenda.",
      done: row.appointments > 0,
      action: "appointment",
    },
  ];
  const completed = tasks.filter((x) => x.done).length;
  return NextResponse.json({
    tasks,
    completed,
    total: tasks.length,
    percent: Math.round((completed / tasks.length) * 100),
    complete: completed === tasks.length,
  });
}
