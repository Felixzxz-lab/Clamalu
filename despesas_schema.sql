-- ============================================================
--  MÓDULO FINANCEIRO — DESPESAS GERAIS
--  Rode este script no SQL Editor do Supabase.
--  É ADITIVO: não altera as tabelas usuarios / vendas / uploads.
-- ============================================================

-- TABELA DE DESPESAS (formato "longo": 1 linha por fornecedor x mês)
create table if not exists despesas (
  id bigserial primary key,
  despesa   text,             -- fornecedor/rubrica (ex.: "CHR HANSEN", "ICMS")
  categoria text,             -- tipo original da planilha (ex.: "Revenda")
  grupo     text,             -- grupo limpo p/ gráficos (ex.: "Impostos e Encargos")
  ano       integer,
  mes       integer,          -- 1..12
  valor     numeric(14,2),
  upload_id uuid,
  criado_em timestamptz default now()
);

create index if not exists idx_despesas_ano   on despesas(ano);
create index if not exists idx_despesas_mes   on despesas(mes);
create index if not exists idx_despesas_grupo on despesas(grupo);

-- Libera a nova página "financeiro" para o admin e para novos usuários.
-- (usuários já existentes recebem acesso individual pelo painel Admin)
update usuarios
   set paginas = array_append(paginas, 'financeiro')
 where role = 'admin'
   and not ('financeiro' = any(paginas));
