import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
export const CUSTOMER_COOKIE = "navalha_customer";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production")
    throw new Error("AUTH_SECRET é obrigatório em produção");
  return new TextEncoder().encode(value || "development-secret-change-me");
};
export type CustomerSession = {
  clientId: string;
  organizationId: string;
  organizationSlug: string;
  name: string;
};
export async function createCustomerSession(data: CustomerSession) {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret()))
      .payload as unknown as CustomerSession;
  } catch {
    return null;
  }
}
