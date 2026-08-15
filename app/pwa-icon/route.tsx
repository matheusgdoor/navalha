import { ImageResponse } from "next/og";

export function GET(request: Request) {
  const url = new URL(request.url);
  const saas = url.searchParams.get("variant") === "saas";
  const requested = Number(url.searchParams.get("size") || 192);
  const size = [180, 192, 512].includes(requested) ? requested : 192;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "#171b17", color: "#bd8136", borderRadius: size * 0.2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size * 0.62, height: size * 0.62, border: `${Math.max(6, size * 0.035)}px solid #bd8136`, borderRadius: saas ? size * 0.18 : size * 0.31, fontSize: size * 0.3, fontWeight: 700 }}>{saas ? "S" : "N"}</div>
      {saas && <div style={{ display: "flex", marginTop: size * 0.025, fontSize: size * 0.075, letterSpacing: size * 0.012 }}>SAAS</div>}
    </div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
