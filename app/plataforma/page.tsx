"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  CircleDollarSign,
  ExternalLink,
  ReceiptText,
  Search,
  ShieldCheck,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
const statusLabel: Record<string, string> = {
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
  TRIAL: "Avaliação",
  PAST_DUE: "Em atraso",
};
const money = (c = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
export default function Platform() {
  const [orgs, setOrgs] = useState<any[]>([]),
    [requests, setRequests] = useState<any[]>([]),
    [plans, setPlans] = useState<any[]>([]),
    [overview, setOverview] = useState<any>(null),
    [billing, setBilling] = useState<any>(null),
    [readiness, setReadiness] = useState<any>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [selected, setSelected] = useState<any>(null),
    [message, setMessage] = useState(""),
    [suspensionError, setSuspensionError] = useState(""),
    [suspensionWorking, setSuspensionWorking] = useState(false),
    [forbidden, setForbidden] = useState(false);
  const load = useCallback(async () => {
    const [o, r, p, ready, summary, billingResponse] = await Promise.all([
      fetch("/api/platform/organizations"),
      fetch("/api/platform/requests"),
      fetch("/api/subscription"),
      fetch("/api/readiness"),
      fetch("/api/platform/overview"),
      fetch("/api/platform/billing"),
    ]);
    if (o.status === 403) {
      setForbidden(true);
      return;
    }
    setOrgs(await o.json());
    setRequests(await r.json());
    setPlans((await p.json()).plans || []);
    setReadiness(await ready.json());
    setOverview(await summary.json());
    setBilling(await billingResponse.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const visible = useMemo(
    () =>
      orgs.filter(
        (o) =>
          (status === "ALL" || o.status === status) &&
          `${o.name} ${o.slug} ${o.planName}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [orgs, search, status],
  );
  const pending = requests.filter((r) => r.status === "PENDING"),
    billingWatch = [...orgs]
      .filter((o) => o.periodEnd && o.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining),
    maxActivity = Math.max(
      1,
      ...(overview?.activity || []).map((x: any) => x.appointments),
    );
  async function decide(id: string, decision: string) {
    const r = await fetch(`/api/platform/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      }),
      x = await r.json().catch(() => ({
        error: "O servidor não retornou uma resposta válida",
      }));
    setMessage(
      r.ok
        ? `Solicitação ${decision === "APPROVED" ? "aprovada" : "recusada"}.`
        : x.error,
    );
    if (r.ok) load();
  }
  async function update(id: string, change: any) {
    const r = await fetch(`/api/platform/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      }),
      x = await r.json().catch(() => ({
        error: "O servidor não retornou uma resposta válida",
      }));
    setMessage(r.ok ? "Empresa atualizada." : x.error);
    if (r.ok) {
      setSelected(null);
      load();
    }
    return r.ok;
  }
  async function platformLogout() {
    await fetch("/api/auth/logout-platform", { method: "POST" });
    location.href = "/login-plataforma";
  }
  async function changeSuspension() {
    const suspending = !selected.manualSuspended;
    setSuspensionError("");
    let reason = String(selected.suspensionReason || "").trim();
    if (suspending && !reason)
      reason = prompt("Informe o motivo da suspensão", "")?.trim() || "";
    if (suspending && reason.length < 3) {
      setSuspensionError("Informe um motivo com pelo menos 3 caracteres.");
      return;
    }
    const action = suspending ? "suspender" : "reativar";
    if (!confirm(`Deseja realmente ${action} ${selected.name}?`)) return;
    setSuspensionWorking(true);
    try {
      const ok = await update(selected.id, {
        manualSuspended: suspending,
        suspensionReason: suspending ? reason : "",
      });
      if (!ok)
        setSuspensionError("Não foi possível alterar o acesso da empresa.");
    } finally {
      setSuspensionWorking(false);
    }
  }
  if (forbidden)
    return (
      <main className="platformPage">
        <a href="/login-plataforma" className="backLink">
          <ArrowLeft />
          Voltar ao login da plataforma
        </a>
        <div className="platformForbidden">
          <ShieldCheck />
          <h1>Acesso exclusivo da plataforma</h1>
          <p>Seu usuário não possui permissão de administrador SaaS.</p>
        </div>
      </main>
    );
  const s = overview?.summary || {};
  return (
    <main className="platformPage">
      <div className="platformTop">
        <button className="backLink platformLogout" onClick={platformLogout}>
          <ArrowLeft /> Sair da plataforma
        </button>
        <span className="platformBadge">
          <ShieldCheck />
          Administrador SaaS
        </span>
      </div>
      <div className="managementHead">
        <div>
          <p>OPERAÇÃO NAVALHA SAAS</p>
          <h1>Visão geral da plataforma</h1>
          <small>Receita, clientes, utilização e saúde da operação.</small>
        </div>
        <time>
          {new Date().toLocaleDateString("pt-BR", { dateStyle: "long" })}
        </time>
      </div>
      <section className="saasKpis">
        <Kpi
          icon={<CircleDollarSign />}
          label="Receita mensal (MRR)"
          value={money(s.mrrCents)}
          note={`${s.active || 0} assinaturas ativas`}
          tone="green"
        />
        <Kpi
          icon={<Building2 />}
          label="Empresas"
          value={String(s.organizations || 0)}
          note={`${s.trials || 0} em avaliação`}
          tone="gold"
        />
        <Kpi
          icon={<Users />}
          label="Clientes nas empresas"
          value={String(orgs.reduce((n, o) => n + o.clients, 0))}
          note={`${orgs.reduce((n, o) => n + o.barbers, 0)} barbeiros ativos`}
          tone="blue"
        />
        <Kpi
          icon={<TriangleAlert />}
          label="Atenção necessária"
          value={String((s.risk || 0) + pending.length)}
          note={`${s.dueSoon || 0} vencem em até 7 dias`}
          tone="red"
        />
      </section>
      <section className="panel billingMonitor">
        <div className="billingMonitorHead">
          <span>
            <CalendarClock />
            <div>
              <p>ASSINATURAS E TESTES</p>
              <h2>Próximos vencimentos</h2>
            </div>
          </span>
          <div>
            <b>{s.dueSoon || 0}</b>
            <small>em até 7 dias</small>
            <b>{s.expired || 0}</b>
            <small>vencidas</small>
          </div>
        </div>
        <div className="billingWatchList">
          {billingWatch.length ? (
            billingWatch.slice(0, 8).map((o) => (
              <button key={o.id} onClick={() => setSelected(o)}>
                <span>
                  <b>{o.name}</b>
                  <small>
                    {o.planName} ·{" "}
                    {o.subscriptionStatus === "TRIAL" ? "Teste" : "Mensalidade"}
                  </small>
                </span>
                <span
                  className={
                    o.daysRemaining < 0
                      ? "overdue"
                      : o.daysRemaining <= 7
                        ? "soon"
                        : ""
                  }
                >
                  <b>
                    {o.daysRemaining < 0
                      ? `${Math.abs(o.daysRemaining)}d em atraso`
                      : `${o.daysRemaining}d restantes`}
                  </b>
                  <small>
                    {new Date(o.periodEnd).toLocaleDateString("pt-BR")}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <div className="emptyState">
              Nenhuma assinatura vence nos próximos 30 dias.
            </div>
          )}
        </div>
      </section>
      <section className="panel platformPayments">
        <div className="platformPaymentsHead">
          <span>
            <ReceiptText />
            <div>
              <p>FINANCEIRO SAAS</p>
              <h2>Cobranças Pix</h2>
            </div>
          </span>
          <div>
            <span>
              <small>Recebido no mês</small>
              <b>{money(billing?.summary?.receivedCents)}</b>
            </span>
            <span>
              <small>A receber</small>
              <b>{money(billing?.summary?.pendingCents)}</b>
            </span>
            <span>
              <small>Pagas</small>
              <b>{billing?.summary?.paid || 0}</b>
            </span>
            <span>
              <small>Pendentes</small>
              <b>{billing?.summary?.pending || 0}</b>
            </span>
          </div>
        </div>
        <div className="paymentTable">
          <div>
            <span>Empresa</span>
            <span>Plano</span>
            <span>Valor</span>
            <span>Vencimento</span>
            <span>Status</span>
          </div>
          {billing?.charges?.length ? (
            billing.charges.slice(0, 12).map((charge: any) => (
              <article key={charge.id}>
                <span>
                  <b>{charge.organization}</b>
                  <small>{charge.slug}</small>
                </span>
                <b>{charge.plan}</b>
                <b>{money(charge.amountCents)}</b>
                <span>
                  {new Date(`${charge.dueDate}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )}
                </span>
                <i className={charge.status.toLowerCase()}>
                  {charge.status === "PAID"
                    ? "Pago"
                    : charge.status === "PENDING"
                      ? "Pendente"
                      : charge.status === "EXPIRED"
                        ? "Vencido"
                        : charge.status}
                </i>
              </article>
            ))
          ) : (
            <div className="emptyState">Nenhuma cobrança Pix gerada.</div>
          )}
        </div>
      </section>
      <section className="platformInsights">
        <div className="panel activityChart">
          <div>
            <p>ATIVIDADE DA REDE</p>
            <h2>Agendamentos nos últimos 7 dias</h2>
          </div>
          <div className="activityBars">
            {overview?.activity?.map((x: any) => (
              <article key={x.label}>
                <b>{x.appointments}</b>
                <i
                  style={{
                    height: `${Math.max(8, (x.appointments / maxActivity) * 100)}%`,
                  }}
                />
                <small>{x.label}</small>
              </article>
            ))}
          </div>
        </div>
        <div className="panel planMix">
          <p>ASSINATURAS</p>
          <h2>Distribuição por plano</h2>
          {overview?.plans?.map((p: any) => (
            <article key={p.code}>
              <span>
                <b>{p.name}</b>
                <small>{money(p.priceCents)}/mês</small>
              </span>
              <strong>{p.organizations}</strong>
              <i>
                <em
                  style={{
                    width: `${s.organizations ? (p.organizations / s.organizations) * 100 : 0}%`,
                  }}
                />
              </i>
            </article>
          ))}
        </div>
      </section>
      <section className="panel readinessCompact">
        <div>
          <Activity />
          <span>
            <b>Prontidão para produção</b>
            <small>
              {readiness?.checks?.filter((x: any) => x.ok).length || 0} de{" "}
              {readiness?.checks?.length || 0} verificações concluídas
            </small>
          </span>
        </div>
        <div>
          {readiness?.checks?.map((x: any) => (
            <span title={x.label} className={x.ok ? "ok" : ""} key={x.key} />
          ))}
        </div>
        <strong className={readiness?.ready ? "ready" : ""}>
          {readiness?.ready ? "Pronto" : "Em preparação"}
        </strong>
      </section>
      {message && <div className="subscriptionMessage">{message}</div>}
      {pending.length > 0 && (
        <section className="panel platformRequests">
          <h2>
            Solicitações de plano <span>{pending.length}</span>
          </h2>
          {pending.map((r) => (
            <article key={r.id}>
              <div>
                <b>{r.organization}</b>
                <small>
                  {r.requestedBy} ·{" "}
                  {new Date(r.createdAt).toLocaleString("pt-BR")}
                </small>
              </div>
              <strong>
                {r.currentPlan} → {r.requestedPlan}
              </strong>
              <div className="requestActions">
                <button onClick={() => decide(r.id, "REJECTED")}>
                  <X />
                  Recusar
                </button>
                <button
                  className="approve"
                  onClick={() => decide(r.id, "APPROVED")}
                >
                  <Check />
                  Aprovar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      <section className="panel organizationsPanel">
        <div className="organizationsHead">
          <h2>
            <Building2 />
            Empresas
          </h2>
          <div className="orgFilters">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="TRIAL">Avaliação</option>
              <option value="PAST_DUE">Em atraso</option>
              <option value="SUSPENDED">Suspensas</option>
            </select>
            <label>
              <Search />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
              />
            </label>
          </div>
        </div>
        <div className="orgTable">
          <div className="orgHeader">
            <span>Empresa</span>
            <span>Plano</span>
            <span>Vencimento</span>
            <span>Operação no mês</span>
            <span>Status</span>
            <span></span>
          </div>
          {visible.map((o) => (
            <article
              key={o.id}
              onClick={() => {
                setSuspensionError("");
                setSelected(o);
              }}
            >
              <div>
                <b>{o.name}</b>
                <small>
                  {o.members} usuários · criada em{" "}
                  {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                </small>
              </div>
              <div>
                <b>{o.planName || "Sem plano"}</b>
                <small>{money(o.priceCents)}/mês</small>
              </div>
              <div className="orgDue">
                <b>
                  {o.periodEnd
                    ? new Date(o.periodEnd).toLocaleDateString("pt-BR")
                    : "—"}
                </b>
                <small className={o.daysRemaining < 0 ? "overdue" : ""}>
                  {o.daysRemaining < 0
                    ? `${Math.abs(o.daysRemaining)}d atrasada`
                    : `${o.daysRemaining}d restantes`}
                </small>
              </div>
              <span>
                {o.appointmentsMonth} agendas · {money(o.serviceRevenueCents)}
              </span>
              <i
                className={(o.manualSuspended
                  ? "suspended"
                  : o.status
                ).toLowerCase()}
              >
                {o.manualSuspended
                  ? "Suspensa manualmente"
                  : statusLabel[o.status] || o.status}
              </i>
              <button>Detalhes</button>
            </article>
          ))}
        </div>
      </section>
      {selected && (
        <div className="platformModal" onClick={() => setSelected(null)}>
          <section className="panel" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelected(null)}>
              <X />
            </button>
            <p>EMPRESA</p>
            <h2>{selected.name}</h2>
            <a href={`/agendar/${selected.slug}`} target="_blank">
              Página pública <ExternalLink />
            </a>
            <div className="companyStats">
              <span>
                <small>Clientes</small>
                <b>{selected.clients}</b>
              </span>
              <span>
                <small>Barbeiros</small>
                <b>{selected.barbers}</b>
              </span>
              <span>
                <small>Agendas/mês</small>
                <b>{selected.appointmentsMonth}</b>
              </span>
              <span>
                <small>Faturamento</small>
                <b>{money(selected.serviceRevenueCents)}</b>
              </span>
            </div>
            <label>
              Plano
              <select
                value={selected.plan || ""}
                onChange={(e) =>
                  setSelected({ ...selected, plan: e.target.value })
                }
              >
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vencimento da assinatura/teste
              <input
                type="date"
                value={
                  selected.periodEnd
                    ? new Date(selected.periodEnd).toISOString().slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setSelected({ ...selected, periodEnd: e.target.value })
                }
              />
            </label>
            <button
              className="saveCompany"
              onClick={() =>
                update(selected.id, { periodEnd: selected.periodEnd })
              }
            >
              Atualizar vencimento
            </button>
            <button
              className="saveCompany"
              onClick={() => update(selected.id, { plan: selected.plan })}
            >
              Salvar plano
            </button>
            {!selected.manualSuspended && (
              <label className="suspensionReason">
                Motivo da suspensão
                <textarea
                  value={selected.suspensionReason || ""}
                  maxLength={500}
                  placeholder="Ex.: análise de segurança, solicitação contratual ou uso indevido"
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      suspensionReason: e.target.value,
                    })
                  }
                />
              </label>
            )}
            {selected.manualSuspended && selected.suspensionReason && (
              <div className="currentSuspensionReason">
                <small>MOTIVO DA SUSPENSÃO</small>
                <b>{selected.suspensionReason}</b>
              </div>
            )}
            {suspensionError && (
              <div className="suspensionInlineError">{suspensionError}</div>
            )}
            <button
              className={
                selected.manualSuspended ? "reactivateCompany" : "dangerCompany"
              }
              onClick={changeSuspension}
              disabled={suspensionWorking}
            >
              {suspensionWorking
                ? "Processando..."
                : selected.manualSuspended
                  ? "Reativar acesso da empresa"
                  : "Suspender empresa"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
function Kpi({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className="panel">
      <span className={tone}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}
