"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, LockKeyhole, Scissors } from "lucide-react";
import { maskCpf, maskPhone } from "@/lib/masks";

export default function CustomerLoginPage() {
  return <Suspense fallback={<main className="customerLogin"><div className="loading">Carregando...</div></main>}><CustomerLogin /></Suspense>;
}

function CustomerLogin() {
  const params = useSearchParams();
  const organization = params.get("organization") || "navalha";
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/customer/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, cpf, organization }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      location.href = "/cliente";
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally { setLoading(false); }
  }
  return <main className="customerLogin"><form className="accessCard" onSubmit={login}>
    <div className="customerLogo"><Scissors /></div><p>ÁREA DO CLIENTE</p><h1>Consulte seus horários</h1>
    <small>Acesse imediatamente com os mesmos dados informados no agendamento. Nenhum código por WhatsApp é necessário.</small>
    <label>Telefone<input value={phone} inputMode="tel" autoComplete="tel" placeholder="(65) 99999-9999" onChange={(event) => setPhone(maskPhone(event.target.value))} required /></label>
    <label>CPF<input value={cpf} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" onChange={(event) => setCpf(maskCpf(event.target.value))} required /></label>
    <div className="customerPrivacy"><LockKeyhole />Seus dados são usados somente para confirmar sua identidade.</div>
    {message && <div className="adminMessage">{message}</div>}
    <button disabled={loading}>{loading ? "Consultando..." : "Consultar meus horários"}</button>
    <a href={`/agendar/${organization}`} className="backLink"><ArrowLeft />Voltar ao agendamento</a>
  </form></main>;
}
