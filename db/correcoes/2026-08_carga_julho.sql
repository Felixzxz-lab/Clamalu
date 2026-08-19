-- ============================================================
--  CORREÇÕES DE DADOS — conferência da carga de julho/2026
--  Rode no SQL Editor do Supabase. Confira o SELECT final.
--  Origem dos erros: digitação na planilha "Vendas julho atual 2025.xlsx".
-- ============================================================

-- 1) NF 35630 — data digitada como 28/08/2026; as notas 35629 e 35631
--    são de 28/07/2026. Jogava R$ 12.602,60 para agosto.
update vendas
   set data = '2026-07-28', ano = 2026, mes = 7
 where id = 23523 and nf = 35630 and data = '2026-08-28';

-- 2) NF 35656 — data digitada como "30/01/00"; as vizinhas 35655 e 35657
--    são de 30-31/07/2026. Criava o ano 2000 na base (R$ 1.950,42).
update vendas
   set data = '2026-07-30', ano = 2026, mes = 7
 where id = 23566 and nf = 35656 and data = '2000-01-30';

-- 3) NF digitada como 35273 (entre 35472 e 35474, mesmo cliente) — é 35473.
--    35273 já existe: nota real de 20/05/2026 da CITALE BRASIL.
update vendas
   set nf = 35473
 where id = 23250 and nf = 35273 and cliente = 'IND E COM DE LAT FORMOSA LTDA';

-- 4) NF digitada como 36412 — é 35412 (mesma nota, mesmo cliente, mesma data).
update vendas
   set nf = 35412
 where nf = 36412 and data = '2026-06-18' and cliente = 'LAT. QUILEITE LTDA';

-- 5) Admin com lista de responsáveis congelada em THIAGO/WENDEL/CLEBER/CLAMALU:
--    o YGOR era cortado de TODA query (R$ 592.826,45, 22,6% de julho).
--    Array vazio = sem restrição = enxerga todos os vendedores, inclusive os futuros.
update usuarios
   set vendedores = '{}'
 where role = 'admin';

-- 6) OPCIONAL — decisão sua: hoje Romulo e Teste não veem YGOR nem CLAMALU.
--    Descomente UMA das opções.
-- (a) passam a ver todos os vendedores, inclusive os que vierem depois:
-- update usuarios set vendedores = '{}' where email in ('romulo@clamalu.com.br','teste@teste.com.br');
-- (b) continuam restritos, mas com YGOR incluído:
-- update usuarios set vendedores = array['THIAGO','WENDEL','CLEBER','CLAMALU','YGOR']
--  where email in ('romulo@clamalu.com.br','teste@teste.com.br');

-- ============================================================
--  CONFERÊNCIA — depois de rodar, o esperado é:
--    2026 | 7 | 362 linhas | valor_total 2.582.253,47 | fatura_total 2.587.480,57
--    nenhuma linha em ano=2000 nem em 2026/08
-- ============================================================
select ano, mes, count(*) linhas,
       sum(valor_total)  valor_total,
       sum(fatura_total) fatura_total
  from vendas
 where ano in (2000, 2026)
 group by ano, mes
 order by ano, mes;
