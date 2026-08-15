"use client";
import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const installRef = useRef<InstallEvent | null>(null);
  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined;
    const register = async () => {
      if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
      registration = await navigator.serviceWorker.register("/sw.js");
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration?.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
      window.setInterval(() => registration?.update(), 60 * 60 * 1000);
    };
    register().catch(() => undefined);
    const ready = (event: Event) => { event.preventDefault(); installRef.current = event as InstallEvent; setInstallPrompt(event as InstallEvent); };
    const requestInstall = () => installRef.current?.prompt();
    const controllerChanged = () => { if (sessionStorage.getItem("navalha-pwa-reloaded")) return; sessionStorage.setItem("navalha-pwa-reloaded", "1"); location.reload(); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("navalha:install", requestInstall);
    navigator.serviceWorker?.addEventListener("controllerchange", controllerChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("navalha:install", requestInstall);
      navigator.serviceWorker?.removeEventListener("controllerchange", controllerChanged);
    };
  }, []);
  async function install() {
    if (!installPrompt) { location.href = "/instalar"; return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") { installRef.current = null; setInstallPrompt(null); }
  }
  if (waiting) return <aside className="pwaNotice"><div><b>Nova versão disponível</b><small>Atualize para receber as melhorias.</small></div><button onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>Atualizar agora</button></aside>;
  if (!installPrompt) return null;
  return <button className="pwaInstall" onClick={install}>Instalar Navalha</button>;
}
