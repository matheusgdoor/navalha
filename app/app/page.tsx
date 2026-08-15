"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Copy,
  Clock3,
  LayoutDashboard,
  Globe2,
  LogOut,
  Menu,
  Package,
  Plus,
  Scissors,
  Search,
  Settings,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { maskCpf, maskMoney, maskPhone, moneyToCents } from "@/lib/masks";

type Client = {
  id: string;
  name: string;
  phone?: string;
  cpf?: string;
  email?: string;
  created_at: string;
};
type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
};
type Barber = {
  id: string;
  name: string;
  color: string;
  commissionPercent: string;
};
type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED";
  client: string;
  barber: string;
  service: string;
  priceCents: number;
  durationMinutes: number;
};
type Payment = {
  id: string;
  appointmentId: string;
  amountCents: number;
  method: string;
  paidAt: string;
  client: string;
  service: string;
  barber: string;
};
type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "BARBER";
  barberId: string | null;
  organizationSlug?: string;
  features?: { inventorySales?: boolean; loyalty?: boolean };
};
const nav = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Agenda", icon: CalendarDays },
  { label: "Clientes", icon: Users },
  { label: "Serviços", icon: Scissors },
  { label: "Financeiro", icon: WalletCards },
  { label: "Equipe", icon: Users },
  { label: "Disponibilidade", icon: Clock3 },
  { label: "Relatórios", icon: TrendingUp },
];
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
const time = (d: string) =>
  new Date(d).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
function hourAt(timeZone = "America/Cuiaba") {
  return Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(new Date()),
  );
}
function greetingAt(timeZone?: string) {
  const hour = hourAt(timeZone);
  if (hour < 12) return { text: "Bom dia", emoji: "☀️" };
  if (hour < 18) return { text: "Boa tarde", emoji: "👋" };
  return { text: "Boa noite", emoji: "🌙" };
}
function dateAt(value: Date | string, timeZone = "America/Cuiaba") {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(value));
}
const statusLabel = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

export default function Home() {
  const [active, setActive] = useState("Visão geral"),
    [mobile, setMobile] = useState(false),
    [queryText, setQueryText] = useState(""),
    [modal, setModal] = useState<"appointment" | "client" | "service" | null>(
      null,
    ),
    [loading, setLoading] = useState(true),
    [loggingOut, setLoggingOut] = useState(false),
    [error, setError] = useState(""),
    [notificationOpen, setNotificationOpen] = useState(false),
    [notifications, setNotifications] = useState<any>({
      unread: 0,
      notifications: [],
    });
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]),
    [services, setServices] = useState<Service[]>([]),
    [barbers, setBarbers] = useState<Barber[]>([]),
    [appointments, setAppointments] = useState<Appointment[]>([]),
    [payments, setPayments] = useState<Payment[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        [
          "/api/auth/me",
          "/api/dashboard",
          "/api/settings",
          "/api/clients",
          "/api/services",
          "/api/barbers",
          "/api/appointments",
          "/api/payments",
          "/api/onboarding",
        ].map((x) => fetch(x)),
      );
      if (responses.some((r) => r.status === 401)) {
        location.href = "/login";
        return;
      }
      const data = await Promise.all(responses.map((r) => r.json()));
      setCurrentUser(data[0]);
      setDashboard(data[1]);
      setBusiness(data[2]);
      setClients(data[3]);
      setServices(data[4]);
      setBarbers(data[5]);
      setAppointments(data[6]);
      setPayments(data[7]);
      if (responses[8].ok) setOnboarding(data[8]);
    } catch {
      setError("Não foi possível carregar os dados do sistema.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const loadNotifications = useCallback(async () => {
    const response = await fetch("/api/notifications");
    if (response.ok) setNotifications(await response.json());
  }, []);
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  async function readNotification(item?: any) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item ? { id: item.id } : { all: true }),
    });
    await loadNotifications();
    if (item?.href) location.href = item.href;
  }
  const visible = useMemo(
    () =>
      appointments.filter((a) =>
        `${a.client} ${a.service} ${a.barber}`
          .toLowerCase()
          .includes(queryText.toLowerCase()),
      ),
    [appointments, queryText],
  );
  const revenue = payments.reduce((s, p) => s + p.amountCents, 0);
  const visibleNav =
    currentUser?.role === "BARBER"
      ? nav.filter((x) =>
          ["VisÃ£o geral", "Agenda", "Clientes"].includes(x.label),
        )
      : nav;
  const timezone = business?.timezone || "America/Cuiaba";
  const today = dateAt(new Date(), timezone);
  const todayAppointments = appointments.filter(
    (a) => dateAt(a.startsAt, timezone) === today && a.status !== "CANCELED",
  );
  async function updateStatus(id: string, status: Appointment["status"]) {
    const notes =
      status === "CANCELED"
        ? prompt("Motivo do cancelamento (opcional)", "") || undefined
        : undefined;
    const r = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (!r.ok) alert((await r.json()).error);
    await load();
  }
  async function pay(id: string) {
    const method = (
      prompt("Forma de pagamento: PIX, CARD ou CASH", "PIX") || ""
    ).toUpperCase();
    if (!["PIX", "CARD", "CASH"].includes(method)) return;
    const r = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id, method }),
    });
    if (!r.ok) alert((await r.json()).error);
    await load();
  }
  async function editClient(c: Client) {
    const name = prompt("Nome do cliente", c.name);
    if (!name) return;
    const phone = prompt("Telefone", c.phone || "") || "",
      cpf = prompt("CPF", c.cpf || "") || "",
      email = prompt("E-mail", c.email || "") || "";
    const r = await fetch(`/api/clients/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: maskPhone(phone),
        cpf: cpf ? maskCpf(cpf) : "",
        email,
      }),
    });
    if (!r.ok) alert((await r.json()).error);
    await load();
  }
  async function editService(s: Service) {
    const name = prompt("Nome do serviço", s.name),
      price = prompt("Preço em reais", (s.priceCents / 100).toString()),
      duration = prompt("Duração em minutos", s.durationMinutes.toString());
    if (!name || !price || !duration) return;
    const r = await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        priceCents: Math.round(Number(price.replace(",", ".")) * 100),
        durationMinutes: Number(duration),
        active: s.active,
      }),
    });
    if (!r.ok) alert((await r.json()).error);
    await load();
  }
  async function reschedule(a: Appointment) {
    const startsAt = prompt(
      "Nova data e hora (AAAA-MM-DDTHH:mm)",
      new Date(a.startsAt).toISOString().slice(0, 16),
    );
    if (!startsAt) return;
    const r = await fetch(`/api/appointments/${a.id}/reschedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: new Date(startsAt).toISOString() }),
    });
    if (!r.ok) alert((await r.json()).error);
    await load();
  }
  async function logout() {
    if (!confirm("Deseja realmente sair do sistema?")) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      location.href = "/login";
    } catch {
      setLoggingOut(false);
      alert("Não foi possível encerrar a sessão.");
    }
  }
  return (
    <div className="shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brandmark">
            <Scissors />
          </span>
          <div>
            {business?.name || "NAVALHA"}
            <small>BARBER CLUB</small>
          </div>
          <button className="close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <nav>
          {visibleNav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => {
                if (label === "Disponibilidade") {
                  window.location.href = "/disponibilidade";
                  return;
                }
                setActive(label);
                setMobile(false);
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sideBottom">
          {currentUser?.organizationSlug && (
            <>
              <button
                onClick={() =>
                  window.open(
                    `/agendar/${currentUser.organizationSlug}`,
                    "_blank",
                  )
                }
              >
                <Globe2 size={19} />
                Página pública
              </button>
              <button
                onClick={async () => {
                  const url = `${location.origin}/agendar/${currentUser.organizationSlug}`;
                  await navigator.clipboard.writeText(url);
                  alert("Link público copiado.");
                }}
              >
                <Copy size={19} />
                Copiar link público
              </button>
            </>
          )}
          {currentUser?.role === "ADMIN" &&
            currentUser.features?.inventorySales && (
              <button onClick={() => (location.href = "/vendas")}>
                <Package size={19} />
                Produtos e vendas
              </button>
            )}
          {currentUser?.role === "ADMIN" && (
            <button onClick={() => (location.href = "/assinatura")}>
              <CreditCard size={19} />
              Assinatura
            </button>
          )}
          <button
            onClick={() => {
              if (currentUser?.role === "ADMIN")
                location.href = "/administracao";
              else setActive("Configurações");
            }}
          >
            <Settings size={19} />
            Configurações
          </button>
          <div className="profile">
            <span>
              {currentUser?.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "U"}
            </span>
            <div>
              <b>{currentUser?.name || "Usuário"}</b>
              <small>
                {currentUser?.role === "ADMIN" ? "Administrador" : "Barbeiro"}
              </small>
            </div>
            <ChevronDown size={16} />
          </div>
          <button
            className="logoutButton"
            onClick={logout}
            disabled={loggingOut}
          >
            <LogOut size={16} />
            {loggingOut ? "Saindo..." : "Sair do sistema"}
          </button>
        </div>
      </aside>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <main>
        <header>
          <button className="hamb" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="mobileBrand">{business?.name || "NAVALHA"}</div>
          <label className="search">
            <Search />
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Buscar clientes, serviços..."
            />
          </label>
          <button
            className="bell"
            onClick={() => setNotificationOpen(!notificationOpen)}
            aria-label="Notificações"
          >
            <Bell />
            {notifications.unread > 0 && (
              <i>{notifications.unread > 9 ? "9+" : notifications.unread}</i>
            )}
          </button>
          {notificationOpen && (
            <div className="notificationPanel">
              <div>
                <span>
                  <b>Notificações</b>
                  <small>{notifications.unread} não lida(s)</small>
                </span>
                {notifications.unread > 0 && (
                  <button onClick={() => readNotification()}>
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <section>
                {notifications.notifications.length ? (
                  notifications.notifications.map((item: any) => (
                    <button
                      key={item.id}
                      className={item.readAt ? "read" : ""}
                      onClick={() => readNotification(item)}
                    >
                      <i className={item.type.toLowerCase()} />
                      <span>
                        <b>{item.title}</b>
                        <small>{item.message}</small>
                        <time>
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </time>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="emptyState">
                    Nenhuma notificação por enquanto.
                  </div>
                )}
              </section>
            </div>
          )}
          <button className="new" onClick={() => setModal("appointment")}>
            <Plus />
            Novo agendamento
          </button>
        </header>
        <div className="content">
          {error && <div className="systemError">{error}</div>}
          {loading ? (
            <div className="loading">Carregando dados...</div>
          ) : active === "Visão geral" ? (
            <Dashboard
              userName={currentUser?.name || "Usuário"}
              appointments={todayAppointments}
              revenue={revenue}
              clients={clients}
              stats={dashboard}
              timezone={timezone}
              onboarding={currentUser?.role === "ADMIN" ? onboarding : null}
              onOnboarding={(action) => {
                if (action === "settings") location.href = "/administracao";
                else if (action === "privacy") location.href = "/privacidade";
                else if (action === "public") location.href = `/agendar?organization=${currentUser?.organizationSlug || "navalha"}`;
                else if (action === "availability")
                  location.href = "/disponibilidade";
                else if (action === "appointment") setModal("appointment");
                else setActive(action === "services" ? "Serviços" : "Equipe");
              }}
              onNew={() => setModal("appointment")}
            />
          ) : ["Equipe", "Relatórios", "Configurações"].includes(active) ? (
            <AdminPage active={active} />
          ) : (
            <Management
              active={active}
              appointments={visible}
              clients={clients}
              services={services}
              payments={payments}
              onModal={setModal}
              onStatus={updateStatus}
              onPay={pay}
              onEditClient={editClient}
              onEditService={editService}
              onReschedule={reschedule}
            />
          )}
        </div>
      </main>
      {modal && (
        <CrudModal
          type={modal}
          clients={clients}
          services={services}
          barbers={barbers}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Onboarding({
  data,
  onAction,
}: {
  data: any;
  onAction: (action: string) => void;
}) {
  return (
    <section className="panel onboardingPanel">
      <div className="onboardingHead">
        <div>
          <p>PRIMEIROS PASSOS</p>
          <h2>Prepare sua barbearia para receber agendamentos</h2>
        </div>
        <strong>{data.percent}%</strong>
      </div>
      <div className="onboardingProgress">
        <i style={{ width: `${data.percent}%` }} />
      </div>
      <div className="onboardingTasks">
        {data.tasks.map((task: any) => (
          <button
            key={task.key}
            className={task.done ? "done" : ""}
            onClick={() => !task.done && onAction(task.action)}
          >
            <i>{task.done ? "✓" : ""}</i>
            <span>
              <b>{task.label}</b>
              <small>{task.done ? "Concluído" : task.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Dashboard({
  userName,
  appointments,
  revenue,
  clients,
  stats,
  timezone,
  onboarding,
  onOnboarding,
  onNew,
}: {
  userName: string;
  appointments: Appointment[];
  revenue: number;
  clients: Client[];
  stats: any;
  timezone: string;
  onboarding: any;
  onOnboarding: (action: string) => void;
  onNew: () => void;
}) {
  const greeting = greetingAt(timezone);
  return (
    <>
      <section className="welcome">
        <div>
          <p>PAINEL DA BARBEARIA</p>
          <h1>
            {greeting.text}, {userName.split(" ")[0]} {greeting.emoji}
          </h1>
          <small>Dados atualizados diretamente do PostgreSQL.</small>
        </div>
      </section>
      {onboarding && !onboarding.complete && (
        <Onboarding data={onboarding} onAction={onOnboarding} />
      )}
      <section className="metrics">
        <Metric
          icon={<CalendarDays />}
          title="Agendamentos hoje"
          value={String(
            stats?.todayAppointments ?? appointments.length,
          ).padStart(2, "0")}
          note="Agenda atualizada"
          tone="gold"
        />
        <Metric
          icon={<CircleDollarSign />}
          title="Faturamento hoje"
          value={money(stats?.revenue ?? revenue)}
          note="Pagamentos do dia"
          tone="green"
        />
        <Metric
          icon={<Clock3 />}
          title="Próximo horário"
          value={stats?.nextAt ? time(stats.nextAt) : "—"}
          note={appointments[0]?.client || "Agenda livre"}
          tone="rust"
        />
        <Metric
          icon={<Users />}
          title="Clientes cadastrados"
          value={String(stats?.clients ?? clients.length).padStart(2, "0")}
          note="Base persistente"
          tone="blue"
        />
      </section>
      <section className="grid">
        <div className="panel agenda">
          <div className="panelHead">
            <div>
              <p>AGENDA DO DIA</p>
              <h2>Próximos atendimentos</h2>
            </div>
            <button className="new" onClick={onNew}>
              <Plus />
              Agendar
            </button>
          </div>
          <BookingList items={appointments} />
        </div>
        <div className="rightCol">
          <div className="panel performance">
            <div className="panelHead">
              <div>
                <p>DESEMPENHO</p>
                <h2>Resumo financeiro</h2>
              </div>
              <TrendingUp />
            </div>
            <div className="weekTotal">
              <div>
                <small>FATURAMENTO</small>
                <b>{money(revenue)}</b>
              </div>
              <span>Persistido</span>
            </div>
            <div className="bars">
              {[45, 63, 52, 80, 92, 60].map((h, i) => (
                <div key={i}>
                  <i style={{ height: `${h}%` }} />
                  <small>{["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][i]}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
function BookingList({ items }: { items: Appointment[] }) {
  return (
    <div className="bookingList">
      {items.length === 0 ? (
        <Empty text="Nenhum agendamento encontrado." />
      ) : (
        items.slice(0, 8).map((a, i) => (
          <article key={a.id}>
            <time>{time(a.startsAt)}</time>
            <span
              className="stripe"
              style={{ background: ["#d39a4a", "#637c68", "#a46c58"][i % 3] }}
            />
            <div className="bookingInfo">
              <b>{a.client}</b>
              <small>
                {a.service} · {a.durationMinutes} min
              </small>
            </div>
            <div className="barber">
              <small>BARBEIRO</small>
              <span>{a.barber}</span>
            </div>
            <span
              className={`status ${statusLabel[a.status].toLowerCase().replace("í", "i")}`}
            >
              {statusLabel[a.status]}
            </span>
            <b className="price">{money(a.priceCents)}</b>
          </article>
        ))
      )}
    </div>
  );
}
function Management({
  active,
  appointments,
  clients,
  services,
  payments,
  onModal,
  onStatus,
  onPay,
  onEditClient,
  onEditService,
  onReschedule,
}: {
  active: string;
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  payments: Payment[];
  onModal: (x: "appointment" | "client" | "service") => void;
  onStatus: (id: string, s: Appointment["status"]) => void;
  onPay: (id: string) => void;
  onEditClient: (client: Client) => void;
  onEditService: (service: Service) => void;
  onReschedule: (appointment: Appointment) => void;
}) {
  const cfg: Record<string, [string, string]> = {
    Agenda: ["AGENDA", "Organize seus atendimentos"],
    Clientes: ["CLIENTES", "Sua base de clientes"],
    Serviços: ["SERVIÇOS", "Catálogo de serviços"],
    Financeiro: ["FINANCEIRO", "Movimentação financeira"],
  };
  const [tag, title] = cfg[active];
  return (
    <section className="management">
      <div className="managementHead">
        <div>
          <p>{tag}</p>
          <h1>{title}</h1>
          <small>Informações salvas no banco de dados.</small>
        </div>
        {active !== "Financeiro" && (
          <button
            className="new"
            onClick={() =>
              onModal(
                active === "Agenda"
                  ? "appointment"
                  : active === "Clientes"
                    ? "client"
                    : "service",
              )
            }
          >
            <Plus />
            Adicionar
          </button>
        )}
      </div>
      {active === "Agenda" && (
        <div className="panel dataTable">
          <div className="tableHeader">
            <span>Horário</span>
            <span>Cliente</span>
            <span>Serviço</span>
            <span>Barbeiro</span>
            <span>Status</span>
            <span>Ações</span>
          </div>
          {appointments.map((a) => (
            <div className="tableRow actionsRow" key={a.id}>
              <b>
                {new Date(a.startsAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </b>
              <span>{a.client}</span>
              <span>{a.service}</span>
              <span>{a.barber}</span>
              <span
                className={`status ${statusLabel[a.status].toLowerCase().replace("í", "i")}`}
              >
                {statusLabel[a.status]}
              </span>
              <span className="rowActions">
                {a.status !== "COMPLETED" && a.status !== "CANCELED" && (
                  <>
                    {a.status === "PENDING" && (
                      <button onClick={() => onStatus(a.id, "CONFIRMED")}>
                        Confirmar
                      </button>
                    )}
                    <button onClick={() => onPay(a.id)}>Receber</button>
                    <button onClick={() => onReschedule(a)}>Reagendar</button>
                    <button onClick={() => onStatus(a.id, "CANCELED")}>
                      Cancelar
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {active === "Clientes" && (
        <div className="cardsList">
          {clients.map((c, i) => (
            <article className="panel personCard" key={c.id}>
              <div
                className="avatar"
                style={{ background: ["#d39a4a", "#637c68", "#a46c58"][i % 3] }}
              >
                {c.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <b>{c.name}</b>
                <small>
                  {c.phone || "Telefone não informado"} ·{" "}
                  {c.email || "Sem e-mail"}
                </small>
              </div>
              <span>Cadastrado</span>
              <button className="editMini" onClick={() => onEditClient(c)}>
                Editar
              </button>
              <a className="editMini" href={`/clientes/${c.id}`}>
                Histórico
              </a>
            </article>
          ))}
        </div>
      )}
      {active === "Serviços" && (
        <div className="serviceGrid">
          {services.map((s, i) => (
            <article className="panel serviceCard" key={s.id}>
              <span>
                <Scissors />
              </span>
              <small>SERVIÇO {String(i + 1).padStart(2, "0")}</small>
              <h2>{s.name}</h2>
              <div>
                <b>{money(s.priceCents)}</b>
                <em>
                  <Clock3 />
                  {s.durationMinutes} min
                </em>
              </div>
              <button onClick={() => onEditService(s)}>Editar serviço</button>
            </article>
          ))}
        </div>
      )}
      {active === "Financeiro" && (
        <>
          <div className="financeMetrics">
            <Metric
              icon={<CircleDollarSign />}
              title="Receita recebida"
              value={money(payments.reduce((s, p) => s + p.amountCents, 0))}
              note="Pagamentos registrados"
              tone="green"
            />
            <Metric
              icon={<WalletCards />}
              title="Comissões estimadas"
              value={money(
                Math.round(
                  payments.reduce((s, p) => s + p.amountCents, 0) * 0.35,
                ),
              )}
              note="Base de 35%"
              tone="gold"
            />
          </div>
          <div className="panel financePanel">
            <p>ÚLTIMAS MOVIMENTAÇÕES</p>
            <h2>Histórico de pagamentos</h2>
            {payments.length === 0 ? (
              <Empty text="Nenhum pagamento registrado." />
            ) : (
              payments.map((p) => (
                <div className="payment" key={p.id}>
                  <span className="payIcon">
                    <CircleDollarSign />
                  </span>
                  <div>
                    <b>{p.client}</b>
                    <small>
                      {p.service} · {p.barber}
                    </small>
                  </div>
                  <span>{p.method}</span>
                  <strong>{money(p.amountCents)}</strong>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function AdminPage({ active }: { active: string }) {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [from, setFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [reportBarber, setReportBarber] = useState("");
  const [commissionClosures, setCommissionClosures] = useState<any[]>([]);
  const loadAdmin = useCallback(async () => {
    if (active === "Equipe")
      setData(await (await fetch("/api/barbers/manage")).json());
    if (active === "Relatórios") {
      const [report, closures] = await Promise.all([
        fetch(`/api/reports?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z${reportBarber ? `&barberId=${reportBarber}` : ""}`).then((response) => response.json()),
        fetch("/api/commissions").then((response) => response.json()),
      ]);
      setData(report);
      setCommissionClosures(Array.isArray(closures) ? closures : []);
    }
  }, [active, from, to, reportBarber]);
  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);
  async function addBarber(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/barbers/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        phone: f.phone,
        cpf: f.cpf,
        email: f.email,
        password: f.password,
        commissionPercent: Number(f.commission),
        color: f.color,
      }),
    });
    const x = await r.json();
    setMessage(r.ok ? "Barbeiro e acesso criados com sucesso." : x.error);
    if (r.ok) {
      e.currentTarget.reset();
      loadAdmin();
    }
  }
  async function editBarber(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch(`/api/barbers/manage/${editingBarber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        phone: f.phone,
        email: f.email,
        password: f.password,
        commissionPercent: Number(f.commission),
        color: f.color,
        active: f.active === "on",
      }),
    });
    const x = await r.json();
    setMessage(r.ok ? "Cadastro do barbeiro atualizado." : x.error);
    if (r.ok) {
      setEditingBarber(null);
      loadAdmin();
    }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.newPassword !== f.confirm) {
      setMessage("A confirmação não coincide.");
      return;
    }
    const r = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: f.currentPassword,
        newPassword: f.newPassword,
      }),
    });
    const x = await r.json();
    setMessage(r.ok ? "Senha alterada com sucesso." : x.error);
    if (r.ok) e.currentTarget.reset();
  }
  async function closeCommission(barberId: string) {
    if (
      !confirm(
        "Registrar o fechamento desta comissão para o período selecionado?",
      )
    )
      return;
    const r = await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, from, to }),
    });
    const x = await r.json();
    setMessage(r.ok ? "Fechamento de comissão registrado." : x.error);
    if (r.ok) loadAdmin();
  }
  async function settleCommission(id: string, status: "PENDING" | "PAID") {
    if (!confirm(status === "PAID" ? "Confirmar que esta comissão foi paga?" : "Reabrir este pagamento como pendente?")) return;
    const response = await fetch("/api/commissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const result = await response.json();
    setMessage(response.ok ? (status === "PAID" ? "Comissão marcada como paga." : "Comissão reaberta.") : result.error);
    if (response.ok) loadAdmin();
  }
  if (active === "Configurações")
    return (
      <section className="management">
        <div className="managementHead">
          <div>
            <p>SEGURANÇA</p>
            <h1>Configurações da conta</h1>
            <small>Atualize sua senha de acesso.</small>
          </div>
        </div>
        <form className="panel adminForm" onSubmit={password}>
          <Field
            name="currentPassword"
            label="Senha atual"
            type="password"
            required
          />
          <Field
            name="newPassword"
            label="Nova senha"
            type="password"
            required
          />
          <Field
            name="confirm"
            label="Confirmar nova senha"
            type="password"
            required
          />
          {message && <div className="adminMessage">{message}</div>}
          <button className="submit">Alterar senha</button>
        </form>
      </section>
    );
  if (active === "Equipe")
    return (
      <section className="management">
        <div className="managementHead">
          <div>
            <p>EQUIPE</p>
            <h1>Barbeiros e acessos</h1>
            <small>Cada profissional pode ter seu próprio login.</small>
          </div>
        </div>
        <div className="adminSplit">
          <div className="cardsList">
            {Array.isArray(data) &&
              data.map((b: any) => (
                <article className="panel teamCard" key={b.id}>
                  <span className="avatar" style={{ background: b.color }}>
                    {b.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <b>{b.name}</b>
                    <small>{b.email || "Sem acesso"}</small>
                  </div>
                  <strong>{b.commissionPercent}%</strong>
                  <button
                    className="editBarber"
                    onClick={() => {
                      setEditingBarber(b);
                      setMessage("");
                    }}
                  >
                    Editar
                  </button>
                </article>
              ))}
          </div>
          {editingBarber ? (
            <form
              key={editingBarber.id}
              className="panel adminForm"
              onSubmit={editBarber}
            >
              <div className="editFormTitle">
                <h2>Editar barbeiro</h2>
                <button type="button" onClick={() => setEditingBarber(null)}>
                  <X />
                </button>
              </div>
              <Field
                name="name"
                label="Nome"
                required
                defaultValue={editingBarber.name}
              />
              <Field
                name="phone"
                label="Telefone"
                defaultValue={editingBarber.phone || ""}
              />
              <Field
                name="email"
                label="E-mail de acesso"
                type="email"
                defaultValue={editingBarber.email || ""}
              />
              <Field
                name="password"
                label="Nova senha (opcional)"
                type="password"
              />
              <div className="formRow">
                <Field
                  name="commission"
                  label="Comissão (%)"
                  type="number"
                  required
                  defaultValue={editingBarber.commissionPercent}
                />
                <label>
                  Cor
                  <input
                    name="color"
                    type="color"
                    defaultValue={editingBarber.color}
                  />
                </label>
              </div>
              <label className="activeCheck">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editingBarber.active}
                />{" "}
                Barbeiro ativo e com acesso liberado
              </label>
              {message && <div className="adminMessage">{message}</div>}
              <button className="submit">Salvar alterações</button>
            </form>
          ) : (
            <form className="panel adminForm" onSubmit={addBarber}>
              <h2>Novo barbeiro</h2>
              <Field name="name" label="Nome" required />
              <Field name="phone" label="Telefone" />
              <Field
                name="email"
                label="E-mail de acesso"
                type="email"
                required
              />
              <Field
                name="password"
                label="Senha inicial"
                type="password"
                required
              />
              <div className="formRow">
                <Field
                  name="commission"
                  label="Comissão (%)"
                  type="number"
                  required
                />
                <label>
                  Cor
                  <input name="color" type="color" defaultValue="#637c68" />
                </label>
              </div>
              {message && <div className="adminMessage">{message}</div>}
              <button className="submit">Criar barbeiro</button>
            </form>
          )}
        </div>
      </section>
    );
  const summary = data?.summary || { revenue: 0, payments: 0, ticket: 0, commission: 0, net: 0 };
  return (
    <section className="management">
      <div className="managementHead">
        <div>
          <p>RELATÓRIOS</p>
          <h1>Resultados por período</h1>
          <small>Receitas e comissões baseadas nos pagamentos.</small>
        </div>
        <div className="dateFilter">
          <select value={reportBarber} onChange={(e) => setReportBarber(e.target.value)} aria-label="Filtrar por barbeiro">
            <option value="">Todos os barbeiros</option>
            {data?.availableBarbers?.map((barber: any) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <a className="reportExport" href={`/api/reports/export?format=csv&from=${from}&to=${to}${reportBarber ? `&barberId=${reportBarber}` : ""}`}>Exportar CSV</a>
          <a className="reportExport reportExportPdf" href={`/api/reports/export?format=pdf&from=${from}&to=${to}${reportBarber ? `&barberId=${reportBarber}` : ""}`}>Exportar PDF</a>
        </div>
      </div>
      <div className="paymentMethods">
        {data?.methods?.map((method: any) => (
          <div className="panel" key={method.method}><small>{method.method}</small><strong>{money(method.revenue)}</strong><span>{method.payments} pagamentos</span></div>
        ))}
      </div>
      <div className="financeMetrics">
        <Metric
          icon={<CircleDollarSign />}
          title="Receita"
          value={money(summary.revenue)}
          note={`${summary.payments} pagamentos`}
          tone="green"
        />
        <Metric
          icon={<TrendingUp />}
          title="Ticket médio"
          value={money(summary.ticket)}
          note="No período selecionado"
          tone="gold"
        />
        <Metric
          icon={<Users />}
          title="Comissões"
          value={money(summary.commission)}
          note="Total calculado no período"
          tone="blue"
        />
        <Metric
          icon={<WalletCards />}
          title="Líquido estimado"
          value={money(summary.net)}
          note="Receita menos comissões"
          tone="green"
        />
      </div>
      {message && <div className="adminMessage">{message}</div>}
      <div className="panel reportTable">
        <div className="tableHeader">
          <span>Barbeiro</span>
          <span>Atendimentos</span>
          <span>Receita</span>
          <span>Percentual</span>
          <span>Comissão</span>
        </div>
        {data?.barbers?.map((b: any) => (
          <div className="tableRow" key={b.id}>
            <b>{b.name}</b>
            <span>{b.services}</span>
            <span>{money(b.revenue)}</span>
            <span>{b.commissionPercent}%</span>
            <strong>
              {money(b.commission)}{" "}
              <button
                className="closeCommission"
                onClick={() => closeCommission(b.id)}
              >
                Fechar
              </button>
            </strong>
          </div>
        ))}
      </div>
      <div className="panel commissionHistory">
        <h2>Fechamentos de comissão</h2>
        {commissionClosures.length ? commissionClosures.map((closure: any) => <article key={closure.id}>
          <div><b>{closure.barber}</b><small>{new Date(`${closure.periodStart}T12:00:00`).toLocaleDateString("pt-BR")} a {new Date(`${closure.periodEnd}T12:00:00`).toLocaleDateString("pt-BR")} · {closure.commissionPercent}% sobre {money(closure.revenueCents)}</small></div>
          <strong>{money(closure.commissionCents)}</strong>
          <span className={closure.status === "PAID" ? "commissionPaid" : "commissionPending"}>{closure.status === "PAID" ? "Pago" : "Pendente"}</span>
          <button onClick={() => settleCommission(closure.id, closure.status === "PAID" ? "PENDING" : "PAID")}>{closure.status === "PAID" ? "Reabrir" : "Marcar pago"}</button>
        </article>) : <div className="emptyState">Nenhum fechamento registrado.</div>}
      </div>
    </section>
  );
}

function CrudModal({
  type,
  clients,
  services,
  barbers,
  onClose,
  onSaved,
}: {
  type: "appointment" | "client" | "service";
  clients: Client[];
  services: Service[];
  barbers: Barber[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    let url =
      "/api/" +
      (type === "appointment"
        ? "appointments"
        : type === "client"
          ? "clients"
          : "services");
    let body: any =
      type === "client"
        ? data
        : type === "service"
          ? {
              name: data.name,
              priceCents: moneyToCents(String(data.price)),
              durationMinutes: Number(data.duration),
            }
          : {
              clientId: data.clientId,
              barberId: data.barberId,
              serviceId: data.serviceId,
              startsAt: new Date(String(data.startsAt)).toISOString(),
              notes: data.notes,
            };
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }
  const title =
    type === "appointment"
      ? "Novo agendamento"
      : type === "client"
        ? "Cadastrar cliente"
        : "Novo serviço";
  return (
    <div className="modalWrap">
      <form className="modal" onSubmit={submit}>
        <div className="modalTitle">
          <div>
            <p>NOVO REGISTRO</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        {type === "client" && (
          <>
            <Field name="name" label="Nome" required />
            <Field name="phone" label="Telefone" />
            <Field name="cpf" label="CPF" />
            <Field name="email" label="E-mail" type="email" />
          </>
        )}
        {type === "service" && (
          <>
            <Field name="name" label="Nome do serviço" required />
            <div className="formRow">
              <Field name="price" label="Preço (R$)" required />
              <Field
                name="duration"
                label="Duração (min)"
                type="number"
                required
              />
            </div>
          </>
        )}
        {type === "appointment" && (
          <>
            <label>
              Cliente
              <select name="clientId" required>
                {clients.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="formRow">
              <label>
                Barbeiro
                <select name="barberId" required>
                  {barbers.map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Serviço
                <select name="serviceId" required>
                  {services
                    .filter((x) => x.active)
                    .map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.name} — {money(x.priceCents)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <Field
              name="startsAt"
              label="Data e horário"
              type="datetime-local"
              required
            />
            <Field name="notes" label="Observações" />
          </>
        )}
        {error && <div className="loginError">{error}</div>}
        <button className="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={type === "number" ? "0.01" : undefined}
        inputMode={
          name === "phone"
            ? "tel"
            : ["cpf", "price"].includes(name)
              ? "numeric"
              : undefined
        }
        onChange={
          name === "phone"
            ? (e) => (e.currentTarget.value = maskPhone(e.currentTarget.value))
            : name === "cpf"
              ? (e) => (e.currentTarget.value = maskCpf(e.currentTarget.value))
              : name === "price"
                ? (e) =>
                    (e.currentTarget.value = maskMoney(e.currentTarget.value))
                : undefined
        }
      />
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="emptyState">{text}</div>;
}
function Metric({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="metric">
      <span className={`metricIcon ${tone}`}>{icon}</span>
      <div>
        <small>{title}</small>
        <b>{value}</b>
        <p>
          <TrendingUp />
          {note}
        </p>
      </div>
    </article>
  );
}
