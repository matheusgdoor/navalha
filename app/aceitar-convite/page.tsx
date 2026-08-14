"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
export default function AcceptPage() {
  return (
    <Suspense
      fallback={
        <main className="loginPage">
          <div className="loading">Carregando convite...</div>
        </main>
      }
    >
      <Accept />
    </Suspense>
  );
}
function Accept() {
  const token = useSearchParams().get("token") || "",
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      r = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, token }),
      }),
      x = await r.json();
    setMessage(x.message || x.error);
    setDone(r.ok);
  }
  return (
    <main className="accessPage">
      <form className="accessCard" onSubmit={submit}>
        <UserPlus />
        <p>CONVITE</p>
        <h1>Criar seu acesso</h1>
        <label>
          Nome completo
          <input name="name" required minLength={2} />
        </label>
        <label>
          Senha
          <input name="password" type="password" required minLength={8} />
        </label>
        {message && <div className="adminMessage">{message}</div>}
        {done ? (
          <a className="devAccessLink" href="/login">
            Acessar o sistema
          </a>
        ) : (
          <button disabled={!token}>Aceitar convite</button>
        )}
      </form>
    </main>
  );
}
