# Clamalu Dashboard

Sistema de relatórios de vendas com autenticação, controle de acesso por usuário e upload de planilha.

## Stack
- **Frontend/Backend:** Next.js 14 (Vercel)
- **Banco de dados:** Supabase (PostgreSQL)
- **Autenticação:** JWT via cookie httpOnly

## Setup no Supabase

1. Acesse seu projeto Supabase
2. Vá em **SQL Editor**
3. Cole e execute o conteúdo de `supabase_schema.sql`
4. Isso cria as tabelas `usuarios`, `vendas` e `uploads`

## Variáveis de ambiente no Vercel

Configure estas variáveis em **Settings → Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sua-publishable-key>
SUPABASE_SECRET_KEY=<sua-secret-key>
JWT_SECRET=<seu-jwt-secret>
```

> ⚠️ Nunca comite as chaves reais. Copie `.env.example` para `.env.local` e preencha com os valores reais (o `.env.local` é ignorado pelo Git).

## Credenciais iniciais

- **Admin:** admin@clamalu.com / admin2025
- Troque a senha após o primeiro login

## Fluxo de uso

1. Você loga como admin em `/admin`
2. Cria usuários (clientes) com as páginas que cada um pode acessar
3. Sobe a planilha Excel todo mês
4. Cliente acessa o link, loga e vê só o que você liberou

## Estrutura de páginas

- `/` — Login
- `/admin` — Painel administrativo (só admin)
- `/dashboard/vendedor` — Relatório de vendedores
- `/dashboard/produto` — Relatório de produtos
- `/dashboard/cliente` — Relatório de clientes
- `/dashboard/comparacao` — Comparativo anual
