import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const platformRoute =
    req.nextUrl.pathname === "/plataforma" ||
    req.nextUrl.pathname.startsWith("/api/platform/");
  if (platformRoute && !req.cookies.has("navalha_platform_session")) {
    if (req.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json(
        { error: "Sessão da plataforma necessária" },
        { status: 401 },
      );
    return NextResponse.redirect(new URL("/login-plataforma", req.url));
  }
  if (platformRoute) return NextResponse.next();
  const hasSession = req.cookies.has("navalha_session");
  if (!hasSession) {
    if (req.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json(
        { error: "Sessão necessária" },
        { status: 401 },
      );
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/((?!$|login|login-plataforma|cadastro|agendar|cliente|esqueci-senha|redefinir-senha|aceitar-convite|privacidade|termos|instalar|instalar-saas|offline|manifest.webmanifest|manifest-saas.webmanifest|pwa-icon|sw.js|icons|api/auth|api/customer|api/health|api/public|api/whatsapp|api/billing/webhook|api/billing/lifecycle|_next/static|_next/image|favicon.ico).*)",
  ],
};
