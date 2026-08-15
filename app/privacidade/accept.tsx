"use client";
import { useEffect, useState } from "react";

export default function PrivacyAccept() {
  const [state, setState] = useState<"loading" | "hidden" | "pending" | "saving" | "accepted">("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/privacy/accept").then((response) => response.json()).then((result) => setState(!result.authenticated ? "hidden" : result.accepted ? "accepted" : "pending")).catch(() => setState("hidden"));
  }, []);
  if (state === "loading" || state === "hidden") return null;
  async function accept() {
    setState("saving");
    setError("");
    try {
      const response = await fetch("/api/privacy/accept", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar o aceite.");
      setState("accepted");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar o aceite.");
      setState("pending");
    }
  }
  return <section className="legalAcceptance"><b>{state === "accepted" ? "Aceite registrado" : "Confirmação da empresa"}</b><p>{state === "accepted" ? "Sua organização já confirmou esta versão da política." : "Confirme que leu esta política em nome da organização."}</p>{error && <div className="legalError">{error}</div>}{state !== "accepted" && <button disabled={state === "saving"} onClick={accept}>{state === "saving" ? "Registrando..." : "Li e aceito esta política"}</button>}</section>;
}
