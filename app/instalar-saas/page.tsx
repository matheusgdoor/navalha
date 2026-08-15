"use client";
import { ArrowLeft, ExternalLink, Share2, ShieldCheck, Smartphone } from "lucide-react";

export default function InstallSaasPage() {
  return <main className="installPage installSaasPage">
    <a href="/" className="backLink"><ArrowLeft />Voltar ao início</a>
    <header><div className="installIcon"><ShieldCheck /></div><p>PORTAL ADMINISTRATIVO</p><h1>Instalar Navalha SaaS</h1><span>Este atalho é exclusivo para a administração da plataforma e abre diretamente o painel geral das empresas.</span></header>
    <section className="installSuccess saasInstallAction"><Smartphone /><div><b>Antes de instalar</b><small>Entre com a conta de administrador SaaS e depois adicione esta página à Tela de Início.</small></div><a href="/plataforma">Entrar no portal <ExternalLink /></a></section>
    <section className="installGrid saasInstallGrid">
      <article><Share2 /><h2>No iPhone ou iPad</h2><ol><li>Abra <b>esta página no Safari</b>.</li><li>Entre no portal administrativo pelo botão acima.</li><li>Já dentro do portal, toque em <b>Compartilhar</b>.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Confirme o nome <b>Navalha SaaS</b>.</li></ol></article>
      <article><ShieldCheck /><h2>Atalho protegido</h2><ol><li>O atalho abre em <b>/plataforma</b>.</li><li>Somente administradores SaaS autenticados acessam.</li><li>Ao sair ou expirar a sessão, o login será solicitado novamente.</li></ol></article>
    </section>
  </main>;
}
