-- ============================================================
--  PREÇO EM EURO — gráfico "preço médio em euro" da tela Produto
--  Rode no SQL Editor do Supabase ANTES do deploy que traz o gráfico.
--
--  A importação (lib/planilha.js) passou a ler COTAÇÃO EURO e PREÇO EM EURO.
--  Produto vendido em real (cotação 0 na planilha) fica com as duas nulas.
--  O histórico (out/2024 a set/2026) foi preenchido em 06/10/2026 casando
--  cada linha com as planilhas originais — ver db/README.md.
-- ============================================================

alter table vendas add column if not exists cotacao_euro numeric(10,4);
alter table vendas add column if not exists preco_euro numeric(12,4);
