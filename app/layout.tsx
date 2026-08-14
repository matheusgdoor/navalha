import type { Metadata } from "next";
import "./globals.css";
import "./database-ui.css";
import "./admin-ui.css";
import "./closure-ui.css";
import "./public-booking.css";
import "./public-state.css";
import "./availability.css";
import "./hours-ui.css";
import "./client-history.css";
import "./barber-edit.css";
import "./session-ui.css";
import "./admin-center.css";
import "./error-ui.css";
import "./signup.css";
import "./subscription.css";
import "./platform.css";
import "./platform-dashboard.css";
import "./plan-requests.css";
import "./access-management.css";
import "./sales.css";
import "./landing.css";
import "./onboarding.css";
import "./customer-portal.css";
import "./customer-link.css";

export const metadata: Metadata = {
  title: "Navalha — Gestão para barbearia",
  description: "Agenda e gestão da sua barbearia",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
