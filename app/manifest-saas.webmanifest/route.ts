import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    id: "/plataforma",
    name: "Navalha SaaS — Administração",
    short_name: "Navalha SaaS",
    description: "Administração central da plataforma Navalha",
    start_url: "/plataforma?source=pwa-saas",
    scope: "/",
    display: "standalone",
    background_color: "#171b17",
    theme_color: "#171b17",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/navalha-saas.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/navalha-saas.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Empresas", url: "/plataforma?area=empresas" },
      { name: "Solicitações", url: "/plataforma?area=solicitacoes" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
