# Banco (Supabase / PostgreSQL)

Não existe ferramenta de migration neste projeto: **os scripts abaixo são
colados à mão no SQL Editor do Supabase**, na ordem numérica. Nenhum código da
aplicação lê esta pasta — ela é a memória do que já foi rodado no banco.

Todos são **aditivos e idempotentes** (`if not exists`): rodar de novo não
quebra nada.

## Ordem e situação

| # | arquivo | o que faz | aplicado em produção |
|---|---|---|---|
| 01 | `01_schema_inicial.sql` | tabelas `usuarios`, `vendas`, `uploads`, índices de `vendas` e o admin padrão | ✅ 09/06/2026 |
| 02 | `02_despesas.sql` | tabela `despesas` (módulo Financeiro) + libera a página `financeiro` para o admin | ✅ 10/07/2026 |
| 03 | `03_usuarios_responsaveis.sql` | coluna `usuarios.vendedores` — **substituído pelo 04**, ver abaixo | ✅ 10/07/2026 |
| 04 | `04_vendedores_ocultos.sql` | coluna `usuarios.vendedores_ocultos` e converte a lista do 03 | ✅ 19/08/2026 |

### Sobre o 03 → 04

O 03 guardava **quem o usuário PODE ver** (vazio = vê todos). Na prática ficou
ao contrário do que se queria: para esconder um vendedor era preciso listar
todos os outros, e vendedor novo não aparecia sozinho para quem tinha lista.

O 04 inverte: `vendedores_ocultos` guarda **quem o usuário NÃO vê** (vazio = vê
todos, inclusive quem entrar depois). A coluna antiga `vendedores` **continua no
banco de propósito**, como rede de segurança — o código não lê mais ela. Se
depois de um tempo no ar não fizer falta:

```sql
alter table usuarios drop column vendedores;
```

## `correcoes/`

Scripts pontuais de **correção de dado**, não de estrutura. São específicos de
uma carga e **não devem ser rodados de novo** — cada um trava em `id` e valor
antigo, então repetir não faz efeito, mas também não tem por quê.

| arquivo | o que corrige |
|---|---|
| `2026-08_carga_julho.sql` | erros de digitação da planilha de vendas de julho/2026: NF com data em agosto, NF com data `30/01/00` criando o ano 2000 na base, e duas NFs digitadas trocadas |
| `2026-09_duplicatas_julho.sql` | apaga 47 linhas de julho/2026 importadas duas vezes (+R$ 350 mil), entre elas a do ano 2000 |
| `2026-09_wendel_para_maicon.sql` | reatribui o histórico do WENDEL ao MAICON (assumiu a carteira) e ajusta `vendedores_ocultos`. A importação já converte o nome antigo (`lib/planilha.js`) |

## RLS

Todas as tabelas estão com **Row Level Security ligada** e sem policy pública —
a chave `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` retorna `[]` em qualquer uma
delas. Quem lê e escreve é sempre a API do Next, pelo servidor, com
`SUPABASE_SECRET_KEY`. Tabela nova precisa ser criada com **"Run and enable
RLS"**, senão vaza.
