# Checklist de produção

## Compatibilidade de hospedagem

Esta aplicação é um servidor **Next.js 15 / Node.js**, não uma aplicação Laravel/PHP.
O Laravel Cloud documenta runtime de aplicação para Laravel 9+ em PHP; a versão do
Node selecionável no painel é destinada aos comandos de build. Antes do deploy,
confirme com o suporte do Laravel Cloud que o ambiente contratado executa um processo
Node persistente com `npm start`. Sem essa confirmação, use uma hospedagem com runtime
Next.js, como Vercel, Railway, Render, Fly.io ou equivalente, mantendo o PostgreSQL gerenciado.

## Comandos

- Instalação: `npm ci`
- Build: `npm run build`
- Migrações: `npm run db:migrate`
- Inicialização: `npm start`
- Health check: `GET /api/health`

## Variáveis obrigatórias

- `NODE_ENV=production`
- `DATABASE_URL` com SSL quando exigido pelo provedor
- `AUTH_SECRET` aleatória com pelo menos 32 caracteres
- `APP_URL=https://seu-dominio`
- `QUEUE_SECRET` aleatória e secreta
- `BILLING_GRACE_DAYS=3`
- `ASAAS_ENVIRONMENT=production` (quando a conta for aprovada)
- `ASAAS_ACCESS_TOKEN` (opcional até a ativação das cobranças)
- `ASAAS_WEBHOOK_TOKEN` com 32 a 255 caracteres (opcional até a ativação)

## Integrações

- Webhook Asaas: `POST https://seu-dominio/api/billing/webhook/asaas`
- Eventos: `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED` e `PAYMENT_REFUNDED`
- Rotina diária: `POST /api/billing/lifecycle` com `Authorization: Bearer QUEUE_SECRET`
- Processador WhatsApp: `POST /api/whatsapp/process` com `Authorization: Bearer QUEUE_SECRET`

## Antes de liberar clientes

- Trocar todas as credenciais locais e senhas administrativas.
- Criar uma conta de administrador SaaS exclusiva, sem vínculo com empresa cliente.
- Antes de liberar cobranças, testar Pix e boleto no sandbox e depois um pagamento real de baixo valor.
- Confirmar backup automático e restauração do PostgreSQL.
- Configurar domínio, HTTPS, logs, alertas e política de retenção.
- Manter pelo menos um ambiente de staging separado de produção.
