-- ============================================================
--  WENDEL -> MAICON — o Maicon assumiu a carteira do Wendel
--  Pedido do cliente em 21/09/2026; aprovado no escopo visual de
--  22/09/2026 ("aparece como Maicon em todos os gráficos e tabelas").
--  Rode no SQL Editor do Supabase. Confira o SELECT final.
--
--  A importação já converte WENDEL -> MAICON (lib/planilha.js), então
--  planilha nova com o nome antigo não recria o vendedor.
-- ============================================================

-- 1) Histórico de vendas passa para o Maicon (≈ 1.650 linhas, 2024–2026).
update vendas
   set vendedor = 'MAICON'
 where vendedor = 'WENDEL';

-- 2) Quem tinha o WENDEL oculto passa a ter o MAICON oculto
--    (sem duplicar, caso o MAICON já estivesse na lista).
update usuarios
   set vendedores_ocultos = array_remove(vendedores_ocultos, 'WENDEL')
                            || case when 'MAICON' = any(vendedores_ocultos) then '{}'::text[] else '{MAICON}'::text[] end
 where 'WENDEL' = any(vendedores_ocultos);

-- ============================================================
--  CONFERÊNCIA — esperado: nenhuma linha de WENDEL, e MAICON com
--  as linhas que eram dele.
-- ============================================================
select vendedor, ano, count(*) as linhas, round(sum(valor_total)::numeric, 2) as valor
  from vendas
 where vendedor in ('WENDEL', 'MAICON')
 group by vendedor, ano
 order by vendedor, ano;
