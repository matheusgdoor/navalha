import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Navalha SaaS — Administração",
  description: "Administração central da plataforma Navalha",
  manifest: "/manifest-saas.webmanifest",
  icons: { icon: "/icons/navalha-saas.svg", apple: "/icons/navalha-saas.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Navalha SaaS" },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return children;
}
