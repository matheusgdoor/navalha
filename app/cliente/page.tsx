"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, RefreshCw, Scissors, X } from "lucide-react";
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
export default function CustomerPortal() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [rescheduling, setRescheduling] = useState<any>(null),
    [rescheduleDate, setRescheduleDate] = useState(""),
    [slots, setSlots] = useState<any[]>([]),
    [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/customer/appointments"),
      x = await r.json();
    if (r.status === 401) {
      location.href = "/cliente/login";
      return;
    }
    setData(x);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function cancel(id: string) {
    if (!confirm("Deseja cancelar este horário?")) return;
    const r = await fetch(`/api/customer/appointments/${id}/cancel`, {
        method: "POST",
      }),
      x = await r.json();
    setError(r.ok ? "Agendamento cancelado." : x.error);
    if (r.ok) load();
  }
  async function findSlots(appointment: any, date: string) {
    setRescheduleDate(date);
    setSlots([]);
    if (!date) return;
    const params = new URLSearchParams({
      serviceId: appointment.serviceId,
      barberId: appointment.barberId,
      date,
      organization: data.customer.organizationSlug,
    });
    const response = await fetch(`/api/public/availability?${params}`);
    const result = await response.json();
    setSlots(Array.isArray(result) ? result : []);
  }
  async function reschedule(startsAt: string) {
    setWorking(true);
    const response = await fetch(
      `/api/customer/appointments/${rescheduling.id}/reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt }),
      },
    );
    const result = await response.json();
    setWorking(false);
    setError(
      response.ok
        ? "Horário reagendado e enviado para confirmação."
        : result.error,
    );
    if (response.ok) {
      setRescheduling(null);
      setSlots([]);
      load();
    }
  }
  if (!data)
    return (
      <main className="customerPortal">
        <div className="loading">Carregando seus agendamentos...</div>
      </main>
    );
  const upcoming = data.appointments.filter(
      (a: any) => new Date(a.startsAt) > new Date() && a.status !== "CANCELED",
    ),
    history = data.appointments.filter(
      (a: any) => new Date(a.startsAt) <= new Date() || a.status === "CANCELED",
    );
  return (
    <main className="customerPortal">
      <header>
        <div>
          <Scissors />
          <span>
            <b>Olá, {data.customer.name.split(" ")[0]}</b>
            <small>Área do cliente</small>
          </span>
        </div>
        <a href={`/agendar/${data.customer.organizationSlug}`}>
          Novo agendamento
        </a>
      </header>
      <section className="customerWelcome">
        <p>MEUS HORÁRIOS</p>
        <h1>Cuide da sua agenda.</h1>
        <small>Consulte ou cancele seus próximos atendimentos.</small>
      </section>
      {error && <div className="subscriptionMessage">{error}</div>}
      <section className="customerAppointments">
        <h2>Próximos agendamentos</h2>
        {upcoming.length ? (
          upcoming.map((a: any) => (
            <article className="panel" key={a.id}>
              <span>
                <CalendarDays />
                <b>
                  {new Date(a.startsAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                  })}
                </b>
              </span>
              <div>
                <h3>{a.service}</h3>
                <small>
                  {a.barber} · {money(a.priceCents)}
                </small>
              </div>
              <strong>
                <Clock3 />
                {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              <div className="customerActions">
                <button
                  className="rescheduleButton"
                  onClick={() => {
                    setRescheduling(a);
                    setRescheduleDate("");
                    setSlots([]);
                  }}
                >
                  <RefreshCw /> Reagendar
                </button>
                <button onClick={() => cancel(a.id)}>
                  <X /> Cancelar
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="emptyState">
            Você não possui agendamentos futuros.
          </div>
        )}
      </section>
      <section className="customerHistory">
        <h2>Histórico</h2>
        {history.map((a: any) => (
          <article key={a.id}>
            <span>{new Date(a.startsAt).toLocaleDateString("pt-BR")}</span>
            <b>{a.service}</b>
            <small>{a.barber}</small>
            <i>{a.status}</i>
          </article>
        ))}
      </section>
      {rescheduling && (
        <div
          className="customerModalBackdrop"
          onMouseDown={() => setRescheduling(null)}
        >
          <section
            className="customerModal panel"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="customerModalClose"
              onClick={() => setRescheduling(null)}
              aria-label="Fechar"
            >
              <X />
            </button>
            <p>REAGENDAR</p>
            <h2>Escolha um novo horário</h2>
            <small>
              {rescheduling.service} com {rescheduling.barber}. A alteração
              exige {data.cancellationNoticeHours}h de antecedência.
            </small>
            <label>
              Nova data
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={rescheduleDate}
                onChange={(e) => findSlots(rescheduling, e.target.value)}
              />
            </label>
            {rescheduleDate && (
              <div className="customerSlots">
                {slots.length ? (
                  slots.map((slot) => (
                    <button
                      key={slot.startsAt}
                      disabled={slot.status !== "AVAILABLE" || working}
                      title={
                        slot.status === "AVAILABLE"
                          ? "Disponível"
                          : "Indisponível"
                      }
                      onClick={() => reschedule(slot.startsAt)}
                    >
                      {new Date(slot.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <small>
                        {slot.status === "AVAILABLE" ? "Livre" : "Reservado"}
                      </small>
                    </button>
                  ))
                ) : (
                  <div className="emptyState">
                    Nenhum horário disponível nesta data.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
