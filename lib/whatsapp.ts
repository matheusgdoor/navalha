import crypto from "crypto";
type Event = "CONFIRMATION" | "REMINDER" | "CANCELLATION";
const templateFor = (event: Event) =>
  process.env[`WHATSAPP_TEMPLATE_${event}`] || "";
export function whatsappConfigured() {
  return (
    process.env.WHATSAPP_ENABLED === "true" &&
    !!process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !!process.env.WHATSAPP_ACCESS_TOKEN
  );
}
export function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
}
export async function sendWhatsApp(
  event: Event,
  recipient: string,
  payload: any,
) {
  if (!whatsappConfigured()) throw new Error("WhatsApp não configurado");
  const template = templateFor(event);
  if (!template) throw new Error(`Template não configurado: ${event}`);
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0",
    id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const body = {
    messaging_product: "whatsapp",
    to: normalizePhone(recipient),
    type: "template",
    template: {
      name: template,
      language: { code: process.env.WHATSAPP_LANGUAGE || "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: payload.client },
            { type: "text", text: payload.service },
            {
              type: "text",
              text: new Date(payload.startsAt).toLocaleString("pt-BR", {
                timeZone: "America/Cuiaba",
              }),
            },
            { type: "text", text: payload.barber },
          ],
        },
      ],
    },
  };
  const r = await fetch(
      `https://graph.facebook.com/${version}/${id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    ),
    data = await r.json();
  if (!r.ok)
    throw new Error(data?.error?.message || "Falha no envio pelo WhatsApp");
  return data.messages?.[0]?.id as string;
}
export function verifyMetaSignature(raw: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected),
    b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
