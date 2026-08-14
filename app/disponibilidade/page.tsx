"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarOff,
  Clock3,
  MessageCircle,
  Trash2,
} from "lucide-react";
type Barber = { id: string; name: string };
const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
export default function Availability() {
  const [data, setData] = useState<any>({
      hours: [],
      blocks: [],
      messages: [],
    }),
    [barbers, setBarbers] = useState<Barber[]>([]),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      Promise.all([
        fetch("/api/schedule").then((r) => r.json()),
        fetch("/api/barbers").then((r) => r.json()),
      ]).then(([d, b]) => {
        setData(d);
        setBarbers(b);
        setSelected((x) => x || b[0]?.id || "");
      }),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function block(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      r = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: f.barberId || null,
          startsAt: new Date(String(f.startsAt)).toISOString(),
          endsAt: new Date(String(f.endsAt)).toISOString(),
          reason: f.reason,
        }),
      }),
      x = await r.json();
    setMessage(r.ok ? "Horário bloqueado com sucesso." : x.error);
    if (r.ok) {
      e.currentTarget.reset();
      load();
    }
  }
  async function saveHour(
    day: number,
    start: string,
    end: string,
    active: boolean,
  ) {
    const r = await fetch("/api/schedule/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId: selected,
        weekday: day,
        startsAt: start,
        endsAt: end,
        active,
      }),
    });
    setMessage(r.ok ? "Expediente atualizado." : (await r.json()).error);
    if (r.ok) load();
  }
  async function remove(id: string) {
    if (!confirm("Remover este bloqueio?")) return;
    await fetch(`/api/schedule/blocks/${id}`, { method: "DELETE" });
    load();
  }
  return (
    <main className="availabilityPage">
      <a href="/app" className="backLink">
        <ArrowLeft />
        Voltar ao painel
      </a>
      <div className="managementHead">
        <div>
          <p>DISPONIBILIDADE</p>
          <h1>Expediente e bloqueios</h1>
          <small>Controle os horários oferecidos na agenda pública.</small>
        </div>
        <a className="new publicLink" href="/agendar" target="_blank">
          Abrir agendamento público
        </a>
      </div>
      {message && <div className="adminMessage">{message}</div>}
      <section className="panel hoursPanel">
        <div className="hoursTitle">
          <h2>
            <Clock3 />
            Expediente semanal
          </h2>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {barbers.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {days.map((day, i) => {
          const h = data.hours?.find(
            (x: any) => x.barber_id === selected && x.weekday === i,
          );
          return (
            <HourRow key={day} day={day} index={i} hour={h} save={saveHour} />
          );
        })}
      </section>
      <section className="availabilityGrid">
        <form className="panel adminForm" onSubmit={block}>
          <h2>Novo bloqueio</h2>
          <label>
            Profissional
            <select name="barberId">
              <option value="">Toda a barbearia</option>
              {barbers.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <Field name="startsAt" label="Início" />
          <Field name="endsAt" label="Fim" />
          <label>
            Motivo
            <input name="reason" placeholder="Folga, almoço, manutenção..." />
          </label>
          <button className="submit">Bloquear período</button>
        </form>
        <div className="panel availabilityList">
          <h2>
            <CalendarOff />
            Próximos bloqueios
          </h2>
          {data.blocks?.length ? (
            data.blocks.map((b: any) => (
              <article key={b.id}>
                <div>
                  <b>{b.barber || "Toda a equipe"}</b>
                  <small>{b.reason || "Indisponível"}</small>
                </div>
                <span>
                  {new Date(b.starts_at).toLocaleString("pt-BR")}
                  <br />
                  até {new Date(b.ends_at).toLocaleString("pt-BR")}
                </span>
                <button className="deleteBlock" onClick={() => remove(b.id)}>
                  <Trash2 />
                </button>
              </article>
            ))
          ) : (
            <p>Nenhum bloqueio futuro.</p>
          )}
        </div>
      </section>
      <section className="panel messageQueue">
        <h2>
          <MessageCircle />
          Fila preparada para WhatsApp
        </h2>
        <p>
          As mensagens permanecem pendentes até as credenciais da Meta serem
          configuradas.
        </p>
        {data.messages?.map((m: any) => (
          <article key={m.id}>
            <span className="queueStatus">{m.status}</span>
            <div>
              <b>{m.client}</b>
              <small>
                {m.event} · {m.recipient}
              </small>
            </div>
            <time>{new Date(m.scheduled_at).toLocaleString("pt-BR")}</time>
          </article>
        ))}
      </section>
    </main>
  );
}
function HourRow({
  day,
  index,
  hour,
  save,
}: {
  day: string;
  index: number;
  hour: any;
  save: (d: number, s: string, e: string, a: boolean) => void;
}) {
  const [s, setS] = useState("09:00"),
    [e, setE] = useState("18:00"),
    [active, setActive] = useState(false);
  useEffect(() => {
    setS(hour?.starts_at?.slice(0, 5) || "09:00");
    setE(hour?.ends_at?.slice(0, 5) || "18:00");
    setActive(hour?.active ?? false);
  }, [hour]);
  return (
    <div className="hourRow">
      <b>{day}</b>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(x) => setActive(x.target.checked)}
        />{" "}
        Aberto
      </label>
      <input type="time" value={s} onChange={(x) => setS(x.target.value)} />
      <span>até</span>
      <input type="time" value={e} onChange={(x) => setE(x.target.value)} />
      <button onClick={() => save(index, s, e, active)}>Salvar</button>
    </div>
  );
}
function Field({ name, label }: { name: string; label: string }) {
  return (
    <label>
      {label}
      <input name={name} type="datetime-local" required />
    </label>
  );
}
