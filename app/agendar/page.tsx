"use client";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Clock3, Scissors } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { maskCpf, maskPhone } from "@/lib/masks";
type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
};
type Barber = { id: string; name: string; color: string };
type Slot = { startsAt: string; status: "AVAILABLE" | "RESERVED" | "BLOCKED" };
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <main className="publicBooking">
          <div className="loading">Carregando agenda...</div>
        </main>
      }
    >
      <Booking />
    </Suspense>
  );
}

function Booking() {
  const requestKey = useRef(crypto.randomUUID());
  const organization = useSearchParams().get("organization") || "navalha";
  const [catalog, setCatalog] = useState<{
      organization?: { name: string; slug: string };
      services: Service[];
      barbers: Barber[];
    }>({ services: [], barbers: [] }),
    [service, setService] = useState(""),
    [barber, setBarber] = useState(""),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<Slot[]>([]),
    [slot, setSlot] = useState(""),
    [done, setDone] = useState(false),
    [error, setError] = useState(""),
    [catalogLoading, setCatalogLoading] = useState(true),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    setCatalogLoading(true);
    setError("");
    fetch(
      `/api/public/catalog?organization=${encodeURIComponent(organization)}`,
    )
      .then(async (r) => {
        const x = await r.json();
        if (!r.ok) throw new Error(x.error || "Barbearia indisponível");
        return x;
      })
      .then((x) => {
        setCatalog(x);
        setService(x.services?.[0]?.id || "");
        setBarber(x.barbers?.[0]?.id || "");
      })
      .catch((e) => {
        setCatalog({ services: [], barbers: [] });
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar esta barbearia.",
        );
      })
      .finally(() => setCatalogLoading(false));
  }, [organization]);
  useEffect(() => {
    if (!service || !barber || !date) return;
    setSlot("");
    fetch(
      `/api/public/availability?serviceId=${service}&barberId=${barber}&date=${date}&organization=${organization}`,
    )
      .then((r) => r.json())
      .then((x) => setSlots(Array.isArray(x) ? x : []));
  }, [service, barber, date, organization]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) {
      setError("Escolha um horário disponível.");
      return;
    }
    setLoading(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/public/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current,
        },
        body: JSON.stringify({
          name: f.name,
          phone: f.phone,
          cpf: f.cpf,
          email: f.email,
          serviceId: service,
          barberId: barber,
          startsAt: slot,
          organization,
          privacyAccepted: f.privacyAccepted === "true",
        }),
      }),
      x = await r.json();
    setLoading(false);
    if (!r.ok) {
      setError(x.error);
      if (r.status === 409) {
        setSlot("");
        const response = await fetch(
          `/api/public/availability?serviceId=${service}&barberId=${barber}&date=${date}&organization=${organization}`,
        );
        const updatedSlots = await response.json();
        setSlots(Array.isArray(updatedSlots) ? updatedSlots : []);
      }
      return;
    }
    setDone(true);
  }
  if (done)
    return (
      <main className="publicSuccess">
        <span>
          <Check />
        </span>
        <h1>Horário solicitado!</h1>
        <p>Seu agendamento foi recebido. A barbearia fará a confirmação.</p>
        <a href="/agendar">Fazer outro agendamento</a>
      </main>
    );
  return (
    <main className="publicBooking">
      <section className="publicIntro">
        <div className="loginLogo">
          <Scissors />
          <span>
            {catalog.organization?.name || "NAVALHA"}
            <small>AGENDE ONLINE</small>
          </span>
        </div>
        <div>
          <p>AGENDE ONLINE</p>
          <h1>
            Seu estilo.
            <br />
            No seu horário.
          </h1>
          <small>
            Escolha o serviço, o profissional e o melhor momento para você.
          </small>
        </div>
      </section>
      <section className="publicFormArea">
        <form className="publicForm" onSubmit={submit}>
          <p>RESERVA DE HORÁRIO</p>
          <h2>Vamos agendar?</h2>
          <a
            className="customerPortalLink"
            href={`/cliente/login?organization=${catalog.organization?.slug || organization}`}
          >
            Já sou cliente · ver meus horários
          </a>
          {catalogLoading && (
            <div className="publicCatalogState">
              Carregando serviços e profissionais...
            </div>
          )}
          {!catalogLoading &&
            !error &&
            (!catalog.services.length || !catalog.barbers.length) && (
              <div className="publicCatalogState">
                <b>Agenda em configuração</b>
                <span>
                  Esta barbearia ainda está preparando seus serviços e
                  profissionais. Tente novamente em breve.
                </span>
              </div>
            )}
          <label>
            Serviço
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              {catalog.services.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name} · {money(s.priceCents)} · {s.durationMinutes} min
                </option>
              ))}
            </select>
          </label>
          <div className="barberChoice">
            <b>Escolha o profissional</b>
            <div>
              {catalog.barbers.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={barber === b.id ? "selected" : ""}
                  onClick={() => setBarber(b.id)}
                >
                  <i style={{ background: b.color }}>
                    {b.name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)}
                  </i>
                  <span>
                    <strong>{b.name}</strong>
                    <small>
                      {barber === b.id ? "Selecionado" : "Ver horários"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <label>
            Data
            <div className="publicInput">
              <CalendarDays />
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </label>
          {date && (
            <div className="slotGroup">
              <b>Horários disponíveis</b>
              <div>
                {slots.length ? (
                  slots.map((x) => (
                    <button
                      type="button"
                      className={`${slot === x.startsAt ? "selected" : ""} ${x.status.toLowerCase()}`}
                      onClick={() =>
                        x.status === "AVAILABLE" && setSlot(x.startsAt)
                      }
                      disabled={x.status !== "AVAILABLE"}
                      key={x.startsAt}
                    >
                      <Clock3 />
                      {new Date(x.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </button>
                  ))
                ) : (
                  <small>Nenhum horário disponível nesta data.</small>
                )}
              </div>
            </div>
          )}
          {date && slots.length > 0 && (
            <div className="slotLegend">
              <span>
                <i className="available" />
                Disponível
              </span>
              <span>
                <i className="reserved" />
                Reservado
              </span>
              <span>
                <i className="blocked" />
                Bloqueado
              </span>
            </div>
          )}
          <div className="publicDivider" />
          <label>
            Nome completo
            <input name="name" required />
          </label>
          <div className="formRow">
            <label>
              WhatsApp
              <input
                name="phone"
                inputMode="tel"
                required
                placeholder="(65) 99999-9999"
                onChange={(e) =>
                  (e.currentTarget.value = maskPhone(e.currentTarget.value))
                }
              />
            </label>
            <label>
              E-mail
              <input name="email" type="email" />
            </label>
          </div>
          <label>
            CPF (opcional)
            <input
              name="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              onChange={(e) =>
                (e.currentTarget.value = maskCpf(e.currentTarget.value))
              }
            />
          </label>
          <label className="legalConsent publicLegalConsent">
            <input name="privacyAccepted" type="checkbox" value="true" required />
            <span>Autorizo o uso dos dados para realizar o agendamento e confirmo que li a <a href="/privacidade" target="_blank">Política de Privacidade</a>.</span>
          </label>
          {error && <div className="loginError">{error}</div>}
          <button
            className="publicSubmit"
            disabled={loading || catalogLoading || !service || !barber}
          >
            {loading ? "Agendando..." : "Solicitar agendamento"}
          </button>
        </form>
      </section>
    </main>
  );
}
