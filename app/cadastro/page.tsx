"use client";
import { FormEvent, useState } from "react";
import { Building2, Scissors } from "lucide-react";
import { maskDocument, maskPhone } from "@/lib/masks";
export default function Signup() {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget)),
      slug = String(f.slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, slug }),
      }),
      x = await r.json();
    if (!r.ok) {
      setError(x.error);
      setLoading(false);
      return;
    }
    location.href = "/app";
  }
  return (
    <main className="signupPage">
      <section>
        <div className="loginLogo">
          <Scissors />
          <span>
            NAVALHA<small>GESTÃO PARA BARBEARIAS</small>
          </span>
        </div>
        <div>
          <p>COMECE AGORA</p>
          <h1>Organize sua barbearia em poucos minutos.</h1>
          <small>
            14 dias para testar agenda, clientes, equipe e financeiro.
          </small>
        </div>
      </section>
      <form className="signupCard" onSubmit={submit}>
        <p>NOVA BARBEARIA</p>
        <h2>Crie sua conta</h2>
        <label>
          Nome da barbearia
          <input name="businessName" required />
        </label>
        <label>
          Endereço exclusivo
          <div className="slugInput">
            <span>navalha.app/</span>
            <input name="slug" required placeholder="minha-barbearia" />
          </div>
        </label>
        <div className="formRow">
          <label>
            Seu nome
            <input name="ownerName" required />
          </label>
          <label>
            WhatsApp
            <input
              name="phone"
              inputMode="tel"
              placeholder="(65) 99999-9999"
              onChange={(e) =>
                (e.currentTarget.value = maskPhone(e.currentTarget.value))
              }
            />
          </label>
        </div>
        <label>
          CPF ou CNPJ
          <input
            name="document"
            inputMode="numeric"
            placeholder="000.000.000-00"
            onChange={(e) =>
              (e.currentTarget.value = maskDocument(e.currentTarget.value))
            }
          />
        </label>
        <label>
          E-mail de acesso
          <input name="email" type="email" required />
        </label>
        <label>
          Senha
          <input name="password" type="password" minLength={8} required />
        </label>
        <label className="legalConsent">
          <input name="privacyAccepted" type="checkbox" value="true" required />
          <span>Li e aceito os <a href="/termos" target="_blank">Termos de Uso</a> e a <a href="/privacidade" target="_blank">Política de Privacidade</a>.</span>
        </label>
        {error && <div className="loginError">{error}</div>}
        <button disabled={loading}>
          {loading ? "Criando..." : "Criar barbearia"}
        </button>
        <footer>
          Já possui conta? <a href="/login">Entrar</a>
        </footer>
      </form>
    </main>
  );
}
