const sandbox = process.env.ASAAS_ENVIRONMENT !== "production";
export const asaasApiUrl = sandbox
  ? "https://api-sandbox.asaas.com/v3"
  : "https://api.asaas.com/v3";
export const asaasCheckoutUrl = sandbox
  ? "https://sandbox.asaas.com/checkoutSession/show?id="
  : "https://asaas.com/checkoutSession/show?id=";
export function asaasConfigured() {
  return Boolean(
    process.env.ASAAS_ACCESS_TOKEN && process.env.ASAAS_WEBHOOK_TOKEN,
  );
}
export async function asaasRequest(path: string, init: RequestInit = {}) {
  const token = process.env.ASAAS_ACCESS_TOKEN;
  if (!token)
    throw new Error("Asaas ainda não configurado. Informe ASAAS_ACCESS_TOKEN.");
  const response = await fetch(`${asaasApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: token,
      ...init.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      data?.errors?.map((x: any) => x.description).join("; ") ||
      data?.message ||
      "Falha na comunicação com o Asaas";
    throw new Error(detail);
  }
  return data;
}
