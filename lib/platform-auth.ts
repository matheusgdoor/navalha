import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const PLATFORM_COOKIE = "navalha_platform_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production")
    throw new Error("AUTH_SECRET é obrigatório em produção");
  return new TextEncoder().encode(value || "development-secret-change-me");
};
export type PlatformSession = {
  sub: string;
  name: string;
  email: string;
  scope: "PLATFORM";
};
export async function createPlatformSession(data: PlatformSession) {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(secret());
}
export async function requirePlatformAdmin(): Promise<PlatformSession | null> {
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || payload.scope !== "PLATFORM") return null;
    return payload as unknown as PlatformSession;
  } catch {
    return null;
  }
}
