import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalar Navalha SaaS",
  description: "Instale o portal administrativo do Navalha SaaS",
  manifest: "/manifest-saas.webmanifest",
  icons: { icon: "/icons/navalha-saas.svg", apple: "/icons/navalha-saas.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Navalha SaaS" },
};

export default function InstallSaasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
