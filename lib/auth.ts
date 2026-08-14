import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "navalha_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production")
    throw new Error("AUTH_SECRET é obrigatório em produção");
  return new TextEncoder().encode(value || "development-secret-change-me");
};
export type Session = {
  sub: string;
  name: string;
  email: string;
  role: "ADMIN" | "BARBER";
  organizationId: string;
  organizationSlug: string;
};
export async function createSession(data: Session) {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.organizationId || !payload.organizationSlug)
      return null;
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
