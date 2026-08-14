"use client";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, Scissors } from "lucide-react";
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="loginPage">
          <div className="loading">Carregando acesso...</div>
        </main>
      }
    >
      <Login />
    </Suspense>
  );
}
function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const platformArea =
    params.get("area") === "saas" || params.get("next") === "/plataforma";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(
        platformArea ? "/api/auth/login-platform" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      router.replace(
        platformArea ? "/plataforma" : params.get("next") || "/app",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="loginPage">
      <section className="loginBrand">
        <div className="loginLogo">
          <Scissors />
          <span>
            NAVALHA<small>BARBER CLUB</small>
          </span>
        </div>
        <div>
          <p>GESTÃO INTELIGENTE</p>
          <h1>Mais tempo para cuidar do seu melhor trabalho.</h1>
          <small>Agenda, clientes e financeiro em um único lugar.</small>
        </div>
      </section>
      <section className="loginArea">
        <form className="loginCard" onSubmit={submit}>
          <p>{platformArea ? "ADMINISTRAÇÃO SAAS" : "ÁREA DA EMPRESA"}</p>
          <h2>{platformArea ? "Acesso à plataforma" : "Bem-vindo de volta"}</h2>
          <small>
            {platformArea
              ? "Entre como administrador da plataforma Navalha."
              : "Entre com seus dados para acessar sua barbearia."}
          </small>
          <label>
            E-mail
            <div>
              <Mail />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>
          <label>
            Senha
            <div>
              <LockKeyhole />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </label>
          {error && <div className="loginError">{error}</div>}
          <button disabled={loading}>
            {loading ? "Entrando..." : "Entrar no sistema"}
          </button>
          {!platformArea && (
            <a className="forgotLink" href="/esqueci-senha">
              Esqueci minha senha
            </a>
          )}
          <footer>
            {platformArea ? (
              <>Portal administrativo protegido</>
            ) : (
              <>
                Acesso protegido · <a href="/cadastro">Criar nova barbearia</a>
              </>
            )}
          </footer>
        </form>
      </section>
    </main>
  );
}
