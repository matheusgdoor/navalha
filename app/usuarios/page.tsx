"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, UserPlus, Users } from "lucide-react";
export default function UsersPage() {
  const [data, setData] = useState<any>({ users: [], invitations: [] }),
    [message, setMessage] = useState(""),
    [link, setLink] = useState("");
  const load = useCallback(
    () =>
      fetch("/api/users")
        .then((r) => r.json())
        .then(setData),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = Object.fromEntries(new FormData(form)),
      r = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      }),
      x = await r.json();
    setMessage(x.message || x.error);
    setLink(x.inviteUrl || "");
    if (r.ok) {
      form.reset();
      load();
    }
  }
  async function toggle(id: string, active: boolean) {
    const r = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }),
      x = await r.json();
    setMessage(r.ok ? "Acesso atualizado." : x.error);
    if (r.ok) load();
  }
  return (
    <main className="usersPage">
      <a className="backLink" href="/administracao">
        <ArrowLeft />
        Voltar à administração
      </a>
      <div className="managementHead">
        <div>
          <p>ACESSOS</p>
          <h1>Usuários e convites</h1>
          <small>Controle quem pode acessar esta organização.</small>
        </div>
      </div>
      {message && <div className="subscriptionMessage">{message}</div>}
      <section className="usersGrid">
        <form className="panel inviteForm" onSubmit={invite}>
          <h2>
            <UserPlus />
            Convidar usuário
          </h2>
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          <label>
            Perfil
            <select name="role">
              <option value="BARBER">Barbeiro</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <button>Gerar convite</button>
          {link && (
            <div className="inviteLink">
              <input readOnly value={link} />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(link)}
              >
                <Copy />
              </button>
            </div>
          )}
        </form>
        <section className="panel usersList">
          <h2>
            <Users />
            Equipe com acesso
          </h2>
          {data.users.map((u: any) => (
            <article key={u.id}>
              <div>
                <b>{u.name}</b>
                <small>
                  {u.email} · {u.role}
                </small>
              </div>
              <i className={u.active ? "active" : ""}>
                {u.active ? "Ativo" : "Inativo"}
              </i>
              <button onClick={() => toggle(u.id, !u.active)}>
                {u.active ? "Desativar" : "Ativar"}
              </button>
            </article>
          ))}
        </section>
      </section>
      {data.invitations.length > 0 && (
        <section className="panel pendingInvites">
          <h2>Convites pendentes</h2>
          {data.invitations.map((i: any) => (
            <article key={i.id}>
              <b>{i.email}</b>
              <span>{i.role}</span>
              <small>
                Expira em {new Date(i.expiresAt).toLocaleDateString("pt-BR")}
              </small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
