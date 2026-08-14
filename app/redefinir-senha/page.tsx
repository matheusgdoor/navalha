"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <main className="loginPage">
          <div className="loading">Carregando...</div>
        </main>
      }
    >
      <Reset />
    </Suspense>
  );
}
function Reset() {
  const token = useSearchParams().get("token") || "",
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      password = String(f.get("password")),
      confirm = String(f.get("confirm"));
    if (password !== confirm) {
      setMessage("As senhas não coincidem.");
      return;
    }
    const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      }),
      x = await r.json();
    setMessage(x.message || x.error);
    setDone(r.ok);
  }
  return (
    <main className="accessPage">
      <form className="accessCard" onSubmit={submit}>
        <LockKeyhole />
        <p>NOVA SENHA</p>
        <h1>Redefinir acesso</h1>
        <label>
          Nova senha
          <input name="password" type="password" minLength={8} required />
        </label>
        <label>
          Confirmar senha
          <input name="confirm" type="password" minLength={8} required />
        </label>
        {message && <div className="adminMessage">{message}</div>}
        {done ? (
          <a className="devAccessLink" href="/login">
            Entrar no sistema
          </a>
        ) : (
          <button disabled={!token}>Salvar nova senha</button>
        )}
      </form>
    </main>
  );
}
