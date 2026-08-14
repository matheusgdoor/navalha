"use client";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
export default function Forgot() {
  const [message, setMessage] = useState(""),
    [link, setLink] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
      x = await r.json();
    setMessage(x.message || x.error);
    setLink(x.devUrl || "");
  }
  return (
    <main className="accessPage">
      <form className="accessCard" onSubmit={submit}>
        <Mail />
        <p>SEGURANÇA</p>
        <h1>Recuperar senha</h1>
        <small>Informe seu e-mail para gerar as instruções.</small>
        <label>
          E-mail
          <input name="email" type="email" required />
        </label>
        {message && <div className="adminMessage">{message}</div>}
        {link && (
          <a className="devAccessLink" href={link}>
            Abrir link de recuperação local
          </a>
        )}
        <button>Enviar instruções</button>
        <a href="/login" className="backLink">
          <ArrowLeft />
          Voltar ao login
        </a>
      </form>
    </main>
  );
}
