# Navalha — Gestão para Barbearia

MVP responsivo em Next.js para agenda, clientes, serviços e visão financeira.

## Executar com PostgreSQL

```bash
npm install
npx docker compose up -d
npm run db:setup
npm run dev
```

Acesse `http://localhost:3000` e entre com `admin@navalha.local` / `Navalha@123`.

Antes de publicar, altere `AUTH_SECRET` e `ADMIN_PASSWORD` no `.env.local`.
