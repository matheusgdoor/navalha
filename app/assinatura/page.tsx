"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  QrCode,
  Send,
  X,
} from "lucide-react";
const money = (c: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
const labels: Record<string, string> = {
  PENDING: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  CANCELED: "Cancelada",
};
export default function Subscription() {
  const [data, setData] = useState<any>(null),
    [requests, setRequests] = useState<any[]>([]),
    [billing, setBilling] = useState<any>(null),
    [message, setMessage] = useState(""),
    [sending, setSending] = useState(""),
    [pix, setPix] = useState<any>(null);
  const load = useCallback(async () => {
    const [a, b, payment] = await Promise.all([
      fetch("/api/subscription").then((r) => r.json()),
      fetch("/api/subscription/requests").then((r) => r.json()),
      fetch("/api/billing/status").then((r) => r.json()),
    ]);
    setData(a);
    setRequests(Array.isArray(b) ? b : []);
    setBilling(payment);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function requestPlan(plan: string) {
    setSending(plan);
    setMessage("");
    const r = await fetch("/api/subscription/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedPlan: plan }),
    });
    const x = await r.json();
    setMessage(
      r.ok ? "Solicitação enviada. Nossa equipe fará a análise." : x.error,
    );
    setSending("");
    if (r.ok) load();
  }
  async function generatePix() {
    setSending("PIX");
    setMessage("");
    const response = await fetch("/api/billing/pix", { method: "POST" });
    const result = await response.json();
    setSending("");
    if (response.ok) setPix(result);
    else setMessage(result.error);
  }
  async function copyPix() {
    await navigator.clipboard.writeText(pix.payload);
    setMessage(
      "Código Pix copiado. Abra o aplicativo do seu banco para pagar.",
    );
  }
  if (!data?.current)
    return (
      <main className="subscriptionPage">
        <div className="loading">Carregando assinatura...</div>
      </main>
    );
  const c = data.current,
    percent = (used: number, limit: number) =>
      Math.min(100, Math.round((used / limit) * 100)),
    pending = requests.some((r) => r.status === "PENDING"),
    deadline = new Date(c.periodEnd),
    daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / 86400000),
    isTrial = c.subscriptionStatus === "TRIAL" || c.status === "TRIAL",
    isExpired = daysRemaining < 0,
    billingLabel = isExpired
      ? "Vencida"
      : isTrial
        ? "Período de teste"
        : daysRemaining <= 7
          ? "Vence em breve"
          : "Em dia";
  return (
    <main className="subscriptionPage">
      <a href="/administracao" className="backLink">
        <ArrowLeft />
        Voltar à administração
      </a>
      <div className="managementHead">
        <div>
          <p>ASSINATURA</p>
          <h1>Plano e utilização</h1>
          <small>Acompanhe os limites e solicite uma mudança de plano.</small>
        </div>
        <span className={`subscriptionStatus ${c.status.toLowerCase()}`}>
          {c.status}
        </span>
      </div>
      <section className="panel currentPlan">
        <div>
          <CreditCard />
          <span>
            <small>PLANO ATUAL</small>
            <h2>{c.planName}</h2>
            <p>{money(c.priceCents)} / mês</p>
          </span>
        </div>
        <div className="usage">
          <Usage
            label="Barbeiros"
            used={c.barbersUsed}
            limit={c.barberLimit}
            percent={percent(c.barbersUsed, c.barberLimit)}
          />
          <Usage
            label="Agendamentos no mês"
            used={c.appointmentsUsed}
            limit={c.appointmentLimit}
            percent={percent(c.appointmentsUsed, c.appointmentLimit)}
          />
          <Usage
            label="Mensagens WhatsApp"
            used={c.whatsappUsed}
            limit={c.whatsappLimit}
            percent={
              c.whatsappLimit ? percent(c.whatsappUsed, c.whatsappLimit) : 0
            }
          />
        </div>
      </section>
      <section
        className={`subscriptionTimeline ${isExpired ? "expired" : daysRemaining <= 7 ? "warning" : ""}`}
      >
        <article className="panel">
          <CalendarClock />
          <span>
            <small>{isTrial ? "FIM DO TESTE" : "PRÓXIMO VENCIMENTO"}</small>
            <b>{deadline.toLocaleDateString("pt-BR", { dateStyle: "long" })}</b>
          </span>
        </article>
        <article className="panel">
          {isExpired ? <AlertTriangle /> : <CreditCard />}
          <span>
            <small>SITUAÇÃO FINANCEIRA</small>
            <b>{billingLabel}</b>
            <em>
              {isExpired
                ? `${Math.abs(daysRemaining)} dia(s) em atraso`
                : `${daysRemaining} dia(s) restante(s)`}
            </em>
          </span>
        </article>
        <article className="panel">
          <CreditCard />
          <span>
            <small>VALOR DA MENSALIDADE</small>
            <b>{money(c.priceCents)}</b>
            <em>
              {c.provider
                ? `Cobrança via ${c.provider}`
                : "Cobrança ainda não vinculada"}
            </em>
          </span>
        </article>
      </section>
      {(isExpired || daysRemaining <= 7) && (
        <div className={`billingAlert ${isExpired ? "expired" : ""}`}>
          <AlertTriangle />
          <span>
            <b>
              {isExpired
                ? "Sua assinatura está vencida"
                : `${isTrial ? "Seu teste" : "Sua mensalidade"} vence em breve`}
            </b>
            <small>
              {billing?.configured
                ? "Regularize ou renove pelo pagamento Asaas para manter o acesso."
                : "Entre em contato com a plataforma para renovar seu acesso."}
            </small>
          </span>
        </div>
      )}
      <section className="panel pixRenewal">
        <div>
          <QrCode />
          <span>
            <small>RENOVAÇÃO MENSAL</small>
            <h2>Renove com Pix</h2>
            <p>
              Pagamento único de {money(c.priceCents)}. Após a confirmação, o
              acesso é prorrogado automaticamente por 30 dias.
            </p>
          </span>
        </div>
        <button
          onClick={generatePix}
          disabled={sending === "PIX" || !billing?.configured}
        >
          {sending === "PIX"
            ? "Gerando Pix..."
            : billing?.configured
              ? "Gerar cobrança Pix"
              : "Asaas não configurado"}
        </button>
      </section>
      {message && <div className="subscriptionMessage">{message}</div>}
      <section className="billingProvider panel">
        <div>
          <CreditCard />
          <span>
            <b>Pagamento via Asaas</b>
            <small>
              {billing?.configured
                ? `Integração ativa · ${billing.environment}`
                : "Aguardando credenciais do gateway"}
            </small>
          </span>
        </div>
        <i className={billing?.configured ? "connected" : ""}>
          {billing?.configured ? "Conectado" : "Não configurado"}
        </i>
      </section>
      <h2 className="plansTitle">Planos disponíveis</h2>
      <section className="plansGrid">
        {data.plans.map((p: any) => (
          <article
            className={`panel planCard ${p.code === c.plan ? "selected" : ""}`}
            key={p.code}
          >
            <small>{p.code === c.plan ? "SEU PLANO" : "PLANO"}</small>
            <h2>{p.name}</h2>
            <strong>
              {money(p.priceCents)}
              <em>/mês</em>
            </strong>
            <p>
              <Check />
              {p.barberLimit} barbeiros
            </p>
            <p>
              <Check />
              {p.appointmentLimit} agendamentos/mês
            </p>
            <p>
              <Check />
              {p.whatsappLimit || "Sem"} mensagens WhatsApp
            </p>
            <button
              className={p.code !== c.plan ? "requestPlan" : ""}
              disabled={p.code === c.plan || pending || Boolean(sending)}
              onClick={() => requestPlan(p.code)}
            >
              {p.code === c.plan
                ? "Plano atual"
                : pending
                  ? "Solicitação em análise"
                  : sending === p.code
                    ? "Enviando..."
                    : "Solicitar este plano"}
            </button>
          </article>
        ))}
      </section>
      {billing?.checkouts?.length > 0 && (
        <section className="panel requestHistory">
          <h2>
            <ExternalLink />
            Últimos pagamentos
          </h2>
          {billing.checkouts.map((x: any) => (
            <article key={x.id}>
              <div>
                <b>Plano {x.requestedPlan}</b>
                <small>{new Date(x.createdAt).toLocaleString("pt-BR")}</small>
              </div>
              <span className={x.status.toLowerCase()}>{x.status}</span>
            </article>
          ))}
        </section>
      )}
      <section className="panel requestHistory">
        <h2>
          <Send />
          Solicitações de plano
        </h2>
        {requests.length ? (
          requests.map((r) => (
            <article key={r.id}>
              <div>
                <b>
                  {r.currentPlan} → {r.requestedPlanName}
                </b>
                <small>{new Date(r.createdAt).toLocaleString("pt-BR")}</small>
              </div>
              <span className={r.status.toLowerCase()}>
                {labels[r.status] || r.status}
              </span>
            </article>
          ))
        ) : (
          <p>Nenhuma solicitação realizada.</p>
        )}
      </section>
      {pix && (
        <div className="pixModalBackdrop" onMouseDown={() => setPix(null)}>
          <section
            className="panel pixModal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="pixClose"
              onClick={() => setPix(null)}
              aria-label="Fechar"
            >
              <X />
            </button>
            <p>PAGAMENTO PIX</p>
            <h2>Escaneie para renovar</h2>
            <small>
              Plano {c.planName} · {money(pix.amountCents)}
            </small>
            {pix.encodedImage && (
              <img
                src={`data:image/png;base64,${pix.encodedImage}`}
                alt="QR Code Pix"
              />
            )}
            <label>
              Pix copia e cola
              <textarea readOnly value={pix.payload || ""} />
            </label>
            <button className="copyPix" onClick={copyPix}>
              <Copy /> Copiar código Pix
            </button>
            <em>
              A confirmação é automática. Vencimento em{" "}
              {new Date(pix.dueDate).toLocaleDateString("pt-BR")}.
            </em>
          </section>
        </div>
      )}
    </main>
  );
}
function Usage({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
}) {
  return (
    <div className="usageItem">
      <div>
        <b>{label}</b>
        <span>
          {used} / {limit}
        </span>
      </div>
      <i>
        <em style={{ width: `${percent}%` }} />
      </i>
    </div>
  );
}
