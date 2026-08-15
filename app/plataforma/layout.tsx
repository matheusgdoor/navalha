import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Navalha SaaS — Administração",
  description: "Administração central da plataforma Navalha",
  manifest: "/manifest-saas.webmanifest",
  icons: { icon: "/pwa-icon?variant=saas&size=192", apple: "/pwa-icon?variant=saas&size=180" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Navalha SaaS" },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return children;
}
