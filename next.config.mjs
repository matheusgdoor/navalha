/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Mantém o cache de desenvolvimento separado do build de produção.
  // Assim, executar `next build` não invalida um servidor local já aberto.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};
export default nextConfig;
