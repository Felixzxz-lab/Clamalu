# Clamalu Dashboard

Relatórios de vendas e despesas da Clamalu, a partir das planilhas mensais.
Login próprio, com controle de quais páginas e quais vendedores cada usuário vê.

- **Next.js 14** (pages router) — front e API no mesmo projeto, hospedado na **Vercel**
- **Supabase** (PostgreSQL) — dados, com RLS ligada em todas as tabelas
- **Auth própria** — bcrypt + JWT em cookie `httpOnly`

---

## Mapa do repositório

```
pages/                 rotas (o Next liga arquivo -> URL; não mova)
  index.js               / .................. login
  admin/index.js         /admin ............. painel do admin
  dashboard/*.js         /dashboard/* ....... as 5 telas de relatório
  api/auth/*             login, logout, me
  api/admin/*            usuários, upload e prévia de vendas e de despesas
  api/dados/*            o que alimenta cada tela (já com o filtro de acesso)

lib/                   regra de negócio, sem React
  auth.js                JWT, requireAuth/requireAdmin e o filtro de vendedor
  supabase.js            os dois clientes: público e admin (secret key)
  db.js                  selectAll() — pagina de 1000 em 1000 (ver Armadilhas)
  planilha.js            leitura da planilha de VENDAS
  despesas.js            leitura da planilha de DESPESAS + classificação em grupos
  cores.js               paleta (aprovada em teste de daltonismo)
  realce.js              helpers do realce cruzado
  duplicatas.js          trava contra importar a mesma venda duas vezes
  segmentos.js           produto -> Culturas / Enzimas / Outros (regra do cliente)
  periodo.js             recortes 'mês fechado' x 'acumulado do ano' e faixas (70%...)

components/            React reaproveitado (Layout, MultiSelect, RealceBanner, ParticipacaoUf)
db/                    os SQL que já foram rodados no Supabase — ver db/README.md
docs/                  o padrão da planilha que o cliente precisa seguir
Planilhas/             planilhas do cliente (fora do Git) + o MODELO em branco
```

## Rodar local

```bash
npm install
cp .env.example .env.local   # e preencha com os valores reais
npm run dev
```

Variáveis (as mesmas em **Vercel → Settings → Environment Variables**):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
JWT_SECRET
```

**Banco novo do zero:** rode os scripts de `db/` na ordem numérica. Detalhes e o
que já está aplicado em produção: [`db/README.md`](db/README.md).

Admin inicial: `admin@clamalu.com` / `admin2025` — troque no primeiro login.

## Deploy

Push na `main` → a Vercel builda sozinha, **a partir da raiz do repositório**.

> Se o commit exigir uma coluna nova, **rode o SQL no Supabase ANTES do push.**
> A tela que usa a coluna quebra no instante em que o deploy sobe.

## Rotina mensal

1. **Vendas** — Admin → Upload. Acumulativo: soma ao que já existe, não substitui.
   Linha que já está na base (mesma NF, data, cliente, produto, qtde e valor)
   é pulada — a prévia avisa quantas (`lib/duplicatas.js`).
2. **Despesas** — Admin → Despesas. Substitui por **ano + mês**: só os meses que
   estão no arquivo. Re-subir um mês corrigido não duplica.
3. Conferir na **prévia** antes de confirmar — ela mostra ano, meses, total e
   distribuição por grupo sem gravar nada.

O formato que a planilha de despesas precisa ter está em
[`docs/padrao-planilha-despesas.md`](docs/padrao-planilha-despesas.md), com um
modelo em branco em `Planilhas/MODELO_DESPESAS_MENSAL.xlsx`.

## Armadilhas (custaram tempo, não repita)

- **Teto de 1000 linhas do Supabase.** Query sem paginação lê só 1000 linhas e
  os KPIs saem truncados sem dar erro nenhum. Em `pages/api/dados/*` use sempre
  `selectAll()` de `lib/db.js`.
- **Datas da planilha vêm como texto `dd/mm/aa`.** `new Date()` falha nelas e as
  linhas somem na importação. O parser de `lib/planilha.js` já trata; não troque
  por `new Date()`.
- **A coluna TOTAL da planilha de despesas é ignorada de propósito** — numa
  planilha real a fórmula tinha falhado numa linha. O total é sempre recalculado
  somando os meses.
- **O ano das despesas sai do NOME DA ABA** (`CLAMALU JULHO 2026`), não do nome
  do arquivo. Aba sem ano cai no ano corrente em silêncio.

## Regras do repositório

- **É público.** Nunca versionar planilha do cliente, contrato ou qualquer coisa
  com CPF/CNPJ. O `.gitignore` já barra `Planilhas/*`, `documentos clamalu/`,
  `CONTRATO*` e `TERMO*` — mantenha assim.
- **A aplicação fica na raiz.** É de lá que a Vercel builda; mover `pages/` para
  uma subpasta derruba o site.
- **RLS ligada em toda tabela nova** ("Run and enable RLS"). Quem lê e escreve é
  a API pelo servidor, com a secret key — nunca o navegador.
