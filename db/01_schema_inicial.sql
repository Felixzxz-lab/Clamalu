-- TABELA DE USUÁRIOS
create table if not exists usuarios (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  email text unique not null,
  senha_hash text not null,
  role text not null default 'cliente', -- 'admin' ou 'cliente'
  ativo boolean default true,
  paginas text[] default array['vendedor','produto','cliente','comparacao'],
  criado_em timestamptz default now()
);

-- TABELA DE DADOS DE VENDAS (carregada pela planilha)
create table if not exists vendas (
  id bigserial primary key,
  nf integer,
  data date,
  cliente text,
  cidade text,
  uf text,
  produto text,
  empresa text,
  qtde integer,
  valor_unit numeric(12,4),
  valor_total numeric(12,2),
  fatura_total numeric(12,2),
  vendedor text,
  ano integer,
  mes integer,
  upload_id uuid,
  criado_em timestamptz default now()
);

-- TABELA DE UPLOADS (histórico de planilhas)
create table if not exists uploads (
  id uuid default gen_random_uuid() primary key,
  nome_arquivo text,
  total_linhas integer,
  enviado_por text,
  criado_em timestamptz default now()
);

-- INDEX para performance
create index if not exists idx_vendas_ano on vendas(ano);
create index if not exists idx_vendas_mes on vendas(mes);
create index if not exists idx_vendas_vendedor on vendas(vendedor);
create index if not exists idx_vendas_cliente on vendas(cliente);
create index if not exists idx_vendas_produto on vendas(produto);
create index if not exists idx_vendas_uf on vendas(uf);

-- INSERIR ADMIN PADRÃO (senha: admin2025 — troque depois)
-- hash gerado com bcrypt rounds=10
insert into usuarios (nome, email, senha_hash, role, paginas)
values (
  'Administrador',
  'admin@clamalu.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LHetEInumhS',
  'admin',
  array['vendedor','produto','cliente','comparacao']
) on conflict (email) do nothing;
