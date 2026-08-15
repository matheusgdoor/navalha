"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Banknote, CheckCircle2, CircleDollarSign, CreditCard, Landmark, LockKeyhole } from "lucide-react";
import { maskMoney, moneyToCents } from "@/lib/masks";

const money = (cents = 0) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default function CashRegisterPage() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(() => fetch("/api/cash-register").then((response) => response.json()).then(setData), []);
  useEffect(() => { load(); }, [load]);
  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit({ action: "OPEN", openingCashCents: moneyToCents(String(form.get("opening"))) });
  }
  async function close(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirm("Conferiu os valores e deseja fechar o caixa de hoje?")) return;
    const form = new FormData(event.currentTarget);
    await submit({ action: "CLOSE", countedCashCents: moneyToCents(String(form.get("cash"))), countedPixCents: moneyToCents(String(form.get("pix"))), countedCardCents: moneyToCents(String(form.get("card"))), notes: String(form.get("notes") || "") });
  }
  async function submit(body: any) {
    const response = await fetch("/api/cash-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(response.ok ? (body.action === "OPEN" ? "Caixa aberto com sucesso." : "Caixa fechado e conferido.") : result.error);
    if (response.ok) load();
  }
  if (!data) return <main className="cashPage"><div className="loading">Carregando caixa...</div></main>;
  const current = data.current;
  const live = current?.liveExpected || { CASH: 0, PIX: 0, CARD: 0 };
  return <main className="cashPage">
    <a className="backLink" href="/app"><ArrowLeft />Voltar ao painel</a>
    <header><div><p>CONTROLE FINANCEIRO</p><h1>Fechamento de caixa</h1><small>Conferência de {new Date(`${data.businessDate}T12:00:00`).toLocaleDateString("pt-BR", { dateStyle: "long" })}</small></div><span className={current?.status === "OPEN" ? "cashOpen" : "cashClosed"}>{current?.status === "OPEN" ? "Caixa aberto" : current ? "Caixa fechado" : "Aguardando abertura"}</span></header>
    {message && <div className="adminMessage">{message}</div>}
    {!current && <form className="panel cashForm openingForm" onSubmit={open}><Landmark /><div><h2>Abrir caixa</h2><p>Informe o dinheiro disponível no início do expediente.</p></div><label>Saldo inicial em dinheiro<input name="opening" inputMode="numeric" defaultValue="0,00" onChange={(e) => e.currentTarget.value = maskMoney(e.currentTarget.value)} required /></label><button>Abrir caixa de hoje</button></form>}
    {current?.status === "OPEN" && <><section className="cashMetrics"><CashMetric icon={<Banknote />} label="Dinheiro esperado" value={current.openingCashCents + live.CASH} note={`Inclui ${money(current.openingCashCents)} de abertura`} /><CashMetric icon={<CircleDollarSign />} label="PIX esperado" value={live.PIX} /><CashMetric icon={<CreditCard />} label="Cartão esperado" value={live.CARD} /></section>
      <form className="panel cashForm closingForm" onSubmit={close}><div className="cashFormHead"><LockKeyhole /><div><h2>Conferir e fechar</h2><p>Informe o total realmente encontrado em cada meio.</p></div></div><div className="cashFields"><MoneyField name="cash" label="Dinheiro contado" /><MoneyField name="pix" label="PIX conferido" /><MoneyField name="card" label="Cartão conferido" /></div><label>Observações<textarea name="notes" maxLength={500} placeholder="Diferenças, retiradas ou ocorrências do dia" /></label><button>Fechar caixa</button></form></>}
    {current?.status === "CLOSED" && <section className="panel closedSummary"><CheckCircle2 /><div><h2>Caixa encerrado</h2><p>Fechado por {current.closedBy} em {new Date(current.closedAt).toLocaleString("pt-BR")}</p></div><strong className={(current.differenceCents || 0) === 0 ? "balanced" : "difference"}>{(current.differenceCents || 0) === 0 ? "Caixa conferido" : `Diferença ${money(current.differenceCents)}`}</strong></section>}
    <section className="panel cashHistory"><h2>Histórico de caixas</h2>{data.history.length ? data.history.map((item: any) => <article key={item.id}><time>{new Date(`${String(item.businessDate).slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR")}</time><div><b>{item.status === "CLOSED" ? "Fechado" : "Aberto"}</b><small>{item.status === "CLOSED" ? `por ${item.closedBy}` : `por ${item.openedBy}`}</small></div><span>Esperado <b>{money((item.expectedCashCents || 0)+(item.expectedPixCents || 0)+(item.expectedCardCents || 0))}</b></span><strong className={(item.differenceCents || 0) === 0 ? "balanced" : "difference"}>{item.status === "CLOSED" ? money(item.differenceCents || 0) : "Em andamento"}</strong></article>) : <div className="emptyState">Nenhum caixa registrado.</div>}</section>
  </main>;
}

function CashMetric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note?: string }) { return <article className="panel"><span>{icon}</span><small>{label}</small><strong>{money(value)}</strong>{note && <em>{note}</em>}</article>; }
function MoneyField({ name, label }: { name: string; label: string }) { return <label>{label}<input name={name} inputMode="numeric" defaultValue="0,00" onChange={(e) => e.currentTarget.value = maskMoney(e.currentTarget.value)} required /></label>; }
