import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalar Navalha SaaS",
  description: "Instale o portal administrativo do Navalha SaaS",
  manifest: "/manifest-saas.webmanifest",
  icons: { icon: "/pwa-icon?variant=saas&size=192", apple: "/pwa-icon?variant=saas&size=180" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Navalha SaaS" },
};

export default function InstallSaasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
