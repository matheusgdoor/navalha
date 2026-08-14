"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Scissors,
} from "lucide-react";
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
const labels: any = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};
export default function ClientHistory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    params.then(({ id }) =>
      fetch(`/api/clients/${id}/history`)
        .then((r) => r.json())
        .then(setData),
    );
  }, [params]);
  if (!data)
    return (
      <main className="clientHistory">
        <div className="loading">Carregando histórico...</div>
      </main>
    );
  const total = data.appointments
    .filter((a: any) => a.paidAt)
    .reduce((s: number, a: any) => s + a.priceCents, 0);
  return (
    <main className="clientHistory">
      <a href="/" className="backLink">
        <ArrowLeft />
        Voltar aos clientes
      </a>
      <section className="panel clientSummary">
        <div>
          <small>FICHA DO CLIENTE</small>
          <h1>{data.client.name}</h1>
          <small>
            {data.client.phone || "Sem telefone"} ·{" "}
            {data.client.email || "Sem e-mail"}
          </small>
        </div>
        <span>
          <CalendarDays />
          Atendimentos<strong>{data.appointments.length}</strong>
        </span>
        <span>
          <CircleDollarSign />
          Total gasto<strong>{money(total)}</strong>
        </span>
        <span>
          <Scissors />
          Última visita
          <strong>
            {data.appointments[0]
              ? new Date(data.appointments[0].startsAt).toLocaleDateString(
                  "pt-BR",
                )
              : "—"}
          </strong>
        </span>
      </section>
      <section className="panel historyTimeline">
        <p>HISTÓRICO COMPLETO</p>
        <h2>Atendimentos</h2>
        {data.appointments.length ? (
          data.appointments.map((a: any) => (
            <article className="historyItem" key={a.id}>
              <time>
                {new Date(a.startsAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
              <b>{a.service}</b>
              <span>{a.barber}</span>
              <span
                className={`status ${labels[a.status]?.toLowerCase().replace("í", "i")}`}
              >
                {labels[a.status]}
              </span>
              <strong>{money(a.priceCents)}</strong>
            </article>
          ))
        ) : (
          <div className="emptyState">Nenhum atendimento registrado.</div>
        )}
      </section>
    </main>
  );
}
