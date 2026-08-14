"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="fatalError">
      <span>
        <AlertTriangle />
      </span>
      <h1>Algo não saiu como esperado</h1>
      <p>Seus dados permanecem seguros. Tente carregar esta área novamente.</p>
      <button onClick={reset}>
        <RefreshCw />
        Tentar novamente
      </button>
      <small>{error.digest && `Código: ${error.digest}`}</small>
    </main>
  );
}
