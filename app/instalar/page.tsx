"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Monitor, Share2, Smartphone } from "lucide-react";

export default function InstallPage() {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [installHelp, setInstallHelp] = useState("");
  const iosHelp = useRef<HTMLElement>(null);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);
  return <main className="installPage">
    <a href="/" className="backLink"><ArrowLeft />Voltar ao início</a>
    <header><div className="installIcon">✂</div><p>APLICATIVO NAVALHA</p><h1>Leve sua barbearia no bolso</h1><span>Instale o Navalha para acessar o painel em tela cheia, com atalho na tela inicial e abertura mais rápida.</span></header>
    {installed ? <section className="installSuccess"><CheckCircle2 /><div><b>Aplicativo instalado</b><small>O Navalha já está sendo executado como aplicativo neste dispositivo.</small></div><a href="/app">Abrir painel</a></section> : <><button className="installPrimary" onClick={() => { if (ios) { setInstallHelp("No iPhone, a instalação é feita pelo menu Compartilhar do Safari. Siga os passos destacados abaixo."); iosHelp.current?.scrollIntoView({ behavior: "smooth", block: "center" }); } else { window.dispatchEvent(new Event("navalha:install")); setInstallHelp("Se a janela não apareceu, abra o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial."); } }}><Download />{ios ? "Como instalar no iPhone" : "Instalar aplicativo"}</button>{installHelp && <div className="installHelp">{installHelp}</div>}</>}
    <section className="installGrid">
      <article><Smartphone /><h2>Android</h2><ol><li>Abra esta página no Chrome.</li><li>Toque em <b>Instalar aplicativo</b>.</li><li>Confirme a instalação.</li></ol></article>
      <article ref={iosHelp} className={ios ? "detectedDevice" : ""}><Share2 /><h2>iPhone e iPad</h2><ol><li>Abra esta página no <b>Safari</b>.</li><li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima).</li><li>Role o menu e escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b> para confirmar.</li></ol>{ios && <small>iPhone/iPad detectado — use estes passos.</small>}</article>
      <article><Monitor /><h2>Computador</h2><ol><li>Abra no Chrome ou Edge.</li><li>Clique no ícone de instalação da barra.</li><li>Confirme para criar o atalho.</li></ol></article>
    </section>
    <section className="installBenefits"><h2>O que você ganha</h2><div><span><CheckCircle2 />Abertura em tela cheia</span><span><CheckCircle2 />Atalho na tela inicial</span><span><CheckCircle2 />Aviso de novas versões</span><span><CheckCircle2 />Tela segura quando estiver offline</span></div></section>
  </main>;
}
