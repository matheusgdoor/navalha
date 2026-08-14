"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Scissors } from "lucide-react";
import { maskPhone } from "@/lib/masks";
export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="customerLogin">
          <div className="loading">Carregando...</div>
        </main>
      }
    >
      <CustomerLogin />
    </Suspense>
  );
}
function CustomerLogin() {
  const params = useSearchParams(),
    organization = params.get("organization") || "navalha",
    [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [step, setStep] = useState<"PHONE" | "CODE">("PHONE"),
    [message, setMessage] = useState(""),
    [devCode, setDevCode] = useState("");
  async function request(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/customer/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, organization }),
      }),
      x = await r.json();
    setMessage(x.message || x.error);
    if (r.ok) {
      setStep("CODE");
      setDevCode(x.devCode || "");
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/customer/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, organization }),
      }),
      x = await r.json();
    if (r.ok) location.href = "/cliente";
    else setMessage(x.error);
  }
  return (
    <main className="customerLogin">
      <form
        className="accessCard"
        onSubmit={step === "PHONE" ? request : verify}
      >
        <div className="customerLogo">
          <Scissors />
        </div>
        <p>ÁREA DO CLIENTE</p>
        <h1>
          {step === "PHONE" ? "Acompanhe seus horários" : "Digite o código"}
        </h1>
        <small>
          {step === "PHONE"
            ? "Use o mesmo WhatsApp informado no agendamento."
            : `Enviamos um código para ${phone}.`}
        </small>
        {step === "PHONE" ? (
          <label>
            WhatsApp
            <input
              value={phone}
              inputMode="tel"
              placeholder="(65) 99999-9999"
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              required
            />
          </label>
        ) : (
          <label>
            Código de 6 dígitos
            <input
              value={code}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
          </label>
        )}
        {devCode && (
          <div className="devCode">
            <MessageCircle />
            Código local: <b>{devCode}</b>
          </div>
        )}
        {message && <div className="adminMessage">{message}</div>}
        <button>
          {step === "PHONE" ? "Receber código" : "Entrar na minha conta"}
        </button>
        {step === "CODE" && (
          <button
            type="button"
            className="customerSecondary"
            onClick={() => setStep("PHONE")}
          >
            Trocar telefone
          </button>
        )}
        <a href={`/agendar/${organization}`} className="backLink">
          <ArrowLeft />
          Voltar ao agendamento
        </a>
      </form>
    </main>
  );
}
