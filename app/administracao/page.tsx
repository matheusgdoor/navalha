"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  FileClock,
  MessageCircle,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { maskDocument, maskPhone } from "@/lib/masks";
export default function AdminCenter() {
  const [settings, setSettings] = useState<any>(null),
    [audit, setAudit] = useState<any[]>([]),
    [health, setHealth] = useState<any>(null),
    [wa, setWa] = useState<any>(null),
    [features, setFeatures] = useState<any>(null),
    [privacy, setPrivacy] = useState<any>({ summary: {}, history: [] }),
    [privacyFilter, setPrivacyFilter] = useState("ALL"),
    [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/audit?limit=50").then((r) => r.json()),
        fetch("/api/health").then((r) => r.json()),
        fetch("/api/whatsapp/status").then((r) => r.json()),
        fetch("/api/features").then((r) => r.json()),
        fetch(`/api/privacy/audit?type=${privacyFilter}`).then((r) => r.json()),
      ]).then(([s, a, h, w, f, p]) => {
        setSettings(s);
        setAudit(Array.isArray(a) ? a : []);
        setHealth(h);
        setWa(w);
        setFeatures(f);
        setPrivacy(p?.history ? p : { summary: {}, history: [] });
      }),
    [privacyFilter],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      }),
      x = await r.json();
    setMessage(r.ok ? "Dados da barbearia atualizados." : x.error);
    if (r.ok) setSettings(x);
  }
  async function toggleInventory() {
    const response = await fetch("/api/features", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventorySales: !features?.inventorySales }),
    });
    const result = await response.json();
    if (response.ok) {
      setFeatures(result);
      setMessage(
        result.inventorySales
          ? "Módulo de produtos ativado."
          : "Módulo de produtos ocultado.",
      );
    } else setMessage(result.error);
  }
  if (!settings)
    return (
      <main className="adminCenter">
        <div className="loading">Carregando central...</div>
      </main>
    );
  return (
    <main className="adminCenter">
      <a className="backLink" href="/app">
        <ArrowLeft />
        Voltar ao painel
      </a>
      <div className="managementHead">
        <div>
          <p>ADMINISTRAÇÃO</p>
          <h1>Central do sistema</h1>
          <small>Configuração, exportação, diagnóstico e auditoria.</small>
        </div>
      </div>
      <section className="adminCenterGrid">
        <form className="panel adminForm" onSubmit={save}>
          <h2>
            <Settings2 />
            Dados da barbearia
          </h2>
          <Field name="name" label="Nome" value={settings.name} />
          <Field name="phone" label="Telefone" value={settings.phone} />
          <Field
            name="document"
            label="CPF ou CNPJ"
            value={settings.document}
          />
          <Field
            name="email"
            label="E-mail"
            type="email"
            value={settings.email}
          />
          <Field name="address" label="Endereço" value={settings.address} />
          <label>
            Fuso horário
            <select name="timezone" defaultValue={settings.timezone}>
              <option>America/Cuiaba</option>
              <option>America/Sao_Paulo</option>
              <option>America/Manaus</option>
              <option>America/Rio_Branco</option>
            </select>
          </label>
          <Field
            name="cancellationNoticeHours"
            label="Antecedência para cancelar ou reagendar (horas)"
            type="number"
            value={String(settings.cancellationNoticeHours ?? 2)}
          />
          {message && <div className="adminMessage">{message}</div>}
          <button className="submit">Salvar configurações</button>
        </form>
        <div>
          <section className="panel systemStatus">
            <h2>Estado do sistema</h2>
            <Status
              icon={<Database />}
              name="PostgreSQL"
              ok={health?.database === "connected"}
            />
            <Status
              icon={<MessageCircle />}
              name="WhatsApp"
              ok={wa?.configured}
              detail={wa?.configured ? "Configurado" : "Aguardando credenciais"}
            />
            <Status icon={<CheckCircle2 />} name="Aplicação" ok={true} />
          </section>
          <section className="panel exports">
            <h2>
              <Download />
              Exportar dados
            </h2>
            <a href="/assinatura">Plano e assinatura</a>
            <a href="/usuarios">Usuários e acessos</a>
            <a href="/vendas">Produtos, estoque e vendas</a>
            <a href="/api/export/clientes">Clientes.csv</a>
            <a href="/api/export/agenda">Agenda.csv</a>
            <a href="/api/export/financeiro">Financeiro.csv</a>
            <a href="/api/privacy/export">Backup LGPD completo.json</a>
            <a href="/privacidade">Política de Privacidade</a>
            <a href="/termos">Termos de Uso</a>
          </section>
          <section className="panel optionalModules">
            <h2>Recursos opcionais</h2>
            <div>
              <span>
                <b>Produtos, bebidas e estoque</b>
                <small>Venda itens no balcão e controle quantidades.</small>
              </span>
              <button
                className={features?.inventorySales ? "enabled" : ""}
                onClick={toggleInventory}
              >
                {features?.inventorySales ? "Ativado" : "Ativar"}
              </button>
            </div>
          </section>
        </div>
      </section>
      <section className="panel auditPanel">
        <div className="privacyHead">
          <h2><ShieldCheck />Auditoria LGPD</h2>
          <select value={privacyFilter} onChange={(event) => setPrivacyFilter(event.target.value)}>
            <option value="ALL">Todas as ações</option>
            <option value="CONSENT">Consentimentos</option>
            <option value="ORGANIZATION_EXPORT">Exportações</option>
            <option value="CLIENT_ANONYMIZATION">Anonimizações</option>
          </select>
        </div>
        <div className="privacyMetrics">
          <span><small>Consentimentos ativos</small><b>{privacy.summary?.consents || 0}</b></span>
          <span><small>Exportações</small><b>{privacy.summary?.exports || 0}</b></span>
          <span><small>Anonimizações</small><b>{privacy.summary?.anonymizations || 0}</b></span>
        </div>
        <div className="privacyHistory">
          {privacy.history?.length ? privacy.history.map((item: any) => <article key={`${item.category}-${item.id}`}>
            <span className={`privacyType ${item.category.toLowerCase()}`}>{item.type === "TERMS_AND_PRIVACY" ? "ACEITE" : item.type === "ORGANIZATION_EXPORT" ? "EXPORTAÇÃO" : item.type === "CLIENT_ANONYMIZATION" ? "ANONIMIZAÇÃO" : item.type}</span>
            <div><b>{item.subject}</b><small>{item.source} · {item.status}{item.revokedAt ? " · Revogado" : ""}</small></div>
            <time>{new Date(item.createdAt).toLocaleString("pt-BR")}</time>
          </article>) : <div className="emptyState">Nenhuma ação LGPD registrada.</div>}
        </div>
      </section>
      <section className="panel auditPanel">
        <h2>
          <FileClock />
          Auditoria de agendamentos
        </h2>
        {audit.length ? (
          audit.map((x) => (
            <article key={x.id}>
              <span className="auditAction">{x.action}</span>
              <div>
                <b>{x.client}</b>
                <small>
                  {x.service} · {x.barber} · por {x.user_name || "Sistema"}
                </small>
              </div>
              <time>{new Date(x.createdAt).toLocaleString("pt-BR")}</time>
            </article>
          ))
        ) : (
          <div className="emptyState">Nenhuma alteração auditada.</div>
        )}
      </section>
    </main>
  );
}
function Field({
  name,
  label,
  type = "text",
  value,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value || ""}
        inputMode={
          name === "phone" ? "tel" : name === "document" ? "numeric" : undefined
        }
        onChange={
          name === "phone"
            ? (e) => (e.currentTarget.value = maskPhone(e.currentTarget.value))
            : name === "document"
              ? (e) =>
                  (e.currentTarget.value = maskDocument(e.currentTarget.value))
              : undefined
        }
      />
    </label>
  );
}
function Status({
  icon,
  name,
  ok,
  detail,
}: {
  icon: any;
  name: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="statusLine">
      <span>{icon}</span>
      <div>
        <b>{name}</b>
        <small>{detail || (ok ? "Operacional" : "Indisponível")}</small>
      </div>
      <i className={ok ? "ok" : ""} />
    </div>
  );
}
