-- ============================================================
--  DUPLICATAS DE JULHO/2026 — achadas em 27/09/2026
--  47 linhas (ids 23897–23943) são cópia exata de vendas que já estavam
--  na base (mesma NF, cliente, produto, quantidade e valor): parte da
--  planilha de julho foi importada duas vezes. Inflava julho em
--  ≈ R$ 350 mil. A linha do "ano 2000" (id 23928) é uma dessas cópias —
--  por isso o 2026-08_carga_julho.sql não a pegou: ele corrigiu a original.
--
--  Só apaga a linha que tem uma gêmea MAIS ANTIGA idêntica; se alguma do
--  bloco não tiver, ela fica.
-- ============================================================

delete from vendas v
 using vendas o
 where v.id between 23897 and 23943
   and o.id < v.id
   and o.nf is not distinct from v.nf
   and o.cliente = v.cliente
   and o.produto = v.produto
   and o.qtde = v.qtde
   and o.valor_total = v.valor_total;

-- CONFERÊNCIA — esperado: 2026/7 com 364 linhas e R$ 2.585.260,37;
-- nenhuma linha em 2000.
select ano, mes, count(*) as linhas, round(sum(valor_total)::numeric, 2) as valor
  from vendas
 where ano = 2000 or (ano = 2026 and mes = 7)
 group by ano, mes;
