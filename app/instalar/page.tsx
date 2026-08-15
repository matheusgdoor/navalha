"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Monitor, Share2, Smartphone } from "lucide-react";

export default function InstallPage() {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);
  return <main className="installPage">
    <a href="/" className="backLink"><ArrowLeft />Voltar ao início</a>
    <header><div className="installIcon">✂</div><p>APLICATIVO NAVALHA</p><h1>Leve sua barbearia no bolso</h1><span>Instale o Navalha para acessar o painel em tela cheia, com atalho na tela inicial e abertura mais rápida.</span></header>
    {installed ? <section className="installSuccess"><CheckCircle2 /><div><b>Aplicativo instalado</b><small>O Navalha já está sendo executado como aplicativo neste dispositivo.</small></div><a href="/app">Abrir painel</a></section> : <button className="installPrimary" onClick={() => window.dispatchEvent(new Event("navalha:install"))}><Download />Instalar aplicativo</button>}
    <section className="installGrid">
      <article><Smartphone /><h2>Android</h2><ol><li>Abra esta página no Chrome.</li><li>Toque em <b>Instalar aplicativo</b>.</li><li>Confirme a instalação.</li></ol></article>
      <article><Share2 /><h2>iPhone e iPad</h2><ol><li>Abra esta página no Safari.</li><li>Toque em <b>Compartilhar</b>.</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li></ol>{ios && <small>Você está usando um dispositivo Apple.</small>}</article>
      <article><Monitor /><h2>Computador</h2><ol><li>Abra no Chrome ou Edge.</li><li>Clique no ícone de instalação da barra.</li><li>Confirme para criar o atalho.</li></ol></article>
    </section>
    <section className="installBenefits"><h2>O que você ganha</h2><div><span><CheckCircle2 />Abertura em tela cheia</span><span><CheckCircle2 />Atalho na tela inicial</span><span><CheckCircle2 />Aviso de novas versões</span><span><CheckCircle2 />Tela segura quando estiver offline</span></div></section>
  </main>;
}
