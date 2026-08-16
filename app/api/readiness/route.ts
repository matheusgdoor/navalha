import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform-auth";
export async function GET() {
  if (!(await requirePlatformAdmin()))
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  let database = false;
  try {
    await query("SELECT 1");
    database = true;
  } catch {}
  const checks = [
    {
      key: "database",
      label: "Banco PostgreSQL",
      ok: database,
      required: true,
    },
    {
      key: "auth",
      label: "Chave segura de autenticação",
      ok: Boolean(
        process.env.AUTH_SECRET &&
        process.env.AUTH_SECRET.length >= 32 &&
        !process.env.AUTH_SECRET.includes("development"),
      ),
      required: true,
    },
    {
      key: "appUrl",
      label: "URL pública HTTPS",
      ok: Boolean(process.env.APP_URL?.startsWith("https://")),
      required: true,
    },
    {
      key: "asaas",
      label: "Gateway Asaas (ativar após aprovação)",
      ok: Boolean(
        process.env.ASAAS_ACCESS_TOKEN && process.env.ASAAS_WEBHOOK_TOKEN,
      ),
      required: false,
    },
    {
      key: "queueSecret",
      label: "Chave das rotinas automáticas",
      ok: Boolean(process.env.QUEUE_SECRET && process.env.QUEUE_SECRET.length >= 24 && !process.env.QUEUE_SECRET.includes("troque")),
      required: true,
    },
    {
      key: "whatsapp",
      label: "WhatsApp Cloud API",
      ok:
        process.env.WHATSAPP_ENABLED === "true" &&
        Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      required: false,
    },
    {
      key: "environment",
      label: "Ambiente de produção",
      ok: process.env.NODE_ENV === "production",
      required: true,
    },
  ];
  return NextResponse.json({
    ready: checks.filter((x) => x.required).every((x) => x.ok),
    checks,
  });
}
