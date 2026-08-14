import { ArrowLeft, Scissors } from "lucide-react";
export default function NotFound() {
  return (
    <main className="fatalError">
      <span>
        <Scissors />
      </span>
      <h1>Página não encontrada</h1>
      <p>O endereço acessado não existe no sistema.</p>
      <a href="/app">
        <ArrowLeft />
        Voltar ao painel
      </a>
    </main>
  );
}
