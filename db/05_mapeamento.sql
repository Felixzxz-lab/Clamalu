-- ============================================================
--  MAPEAMENTO DE MERCADO — páginas Culturas e Enzimas/Coagulantes
--  Rode no SQL Editor do Supabase ANTES do deploy que traz as telas.
--  Clique em "Run and enable RLS" se o editor oferecer.
--
--  Uma linha = empresa × tipo de queijo, já limpa por lib/mapeamento.js.
--  Carga pelo script scripts/carregar-mapeamento.mjs: cada carga SUBSTITUI
--  a categoria inteira (é um retrato do mercado, não um histórico).
-- ============================================================

create table if not exists mapeamento (
  id                    bigserial primary key,
  categoria             text not null check (categoria in ('cultura', 'enzima')),
  linha_planilha        int,
  company_group         text,
  empresa               text not null,
  cidade                text,
  uf                    text not null,
  tipo_queijo           text,
  leite_litros_ano      numeric(16,2),
  queijo_kg_ano         numeric(16,2),
  apresentacao          text,
  agente                text,
  embalagem             numeric,
  unidade               text,
  fornecedor            text,
  marca                 text,
  forca_imcu            numeric,
  dosagem               numeric,
  distribuidor          text,
  sem_produto_comercial boolean not null default false,
  carregado_em          timestamptz default now()
);

create index if not exists idx_mapeamento_categoria on mapeamento(categoria);

-- Sem policy pública: quem lê é a API do Next, com a secret key.
alter table mapeamento enable row level security;

-- Libera as duas páginas novas para o admin
-- (os demais usuários recebem pelo painel Admin; o acesso vale no próximo login).
update usuarios
   set paginas = paginas || array['culturas', 'enzimas']
 where role = 'admin'
   and not ('culturas' = any(paginas));

-- CONFERÊNCIA — esperado: a tabela existe (0 linhas até a carga) e o admin
-- com culturas e enzimas nas páginas.
select (select count(*) from mapeamento) as linhas_mapeamento,
       nome, paginas
  from usuarios
 where role = 'admin';
