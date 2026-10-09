-- ============================================================
--  CORREÇÕES DE DADOS — cotação e preço em euro errados (08/10/2026)
--  Rode no SQL Editor do Supabase. Confira o SELECT final.
--
--  O PREÇO EM EURO da planilha é VALOR UNIT. ÷ COTAÇÃO. Com a cotação
--  digitada errada, o € da linha sai errado e aparece com ⚠ nas telas
--  Cliente e Comparação. O R$ faturado está certo e não muda.
--
--  A cotação certa saiu dos próprios clientes: quem tem preço fixo em euro
--  antes e depois da data mostra a cotação usada (R$ ÷ € fixo). Todas as
--  linhas do mesmo dia dão o mesmo valor.
-- ============================================================

-- 1) 12/03/2026 — 5,1596 → 5,9681. 14 linhas, NFs 34950 a 34958.
--    11 linhas com preço fixo dão 5,9680–5,9684 (ex.: Fleury TCC 20 500 U
--    a € 96,66 antes e depois: 576,88 ÷ 96,66 = 5,9681).
update vendas
   set cotacao_euro = 5.9681, preco_euro = round(valor_unit / 5.9681, 4)
 where id in (22265,22266,22268,22269,22271,22272,22273,22274,22275,22276,22277,22278,22279,22280)
   and data = '2026-03-12' and cotacao_euro = 5.1596;

-- 2) 18/03/2026 — NF 34974 com 6,9961; as outras NFs do dia têm 5,9961.
--    Com 5,9961 o Chymax Extra da Sales e Borges volta aos € 41,20 de sempre.
update vendas
   set cotacao_euro = 5.9961, preco_euro = round(valor_unit / 5.9961, 4)
 where id = 22313 and nf = 34974 and cotacao_euro = 6.9961;

-- 3) 20/07/2026 — 5,1176/5,1177 → 5,8550. 8 linhas, NFs 35590 a 35594.
--    Donizete Chymax M a € 129,20 antes e depois: 756,47 ÷ 129,20 = 5,8550.
update vendas
   set cotacao_euro = 5.8550, preco_euro = round(valor_unit / 5.8550, 4)
 where id in (23456,23457,23458,23459,23460,23461,23462,23463)
   and data = '2026-07-20' and cotacao_euro in (5.1176, 5.1177);

-- 4) 25/08/2026 — NF 35812 com 5,057 → 6,057 (5 no lugar do 6).
--    Com 6,057 os dois itens da Formosa voltam exatamente aos preços
--    anteriores: € 113,92 (TCC 20 500 U) e € 16,81 (RSF 736 50 U).
update vendas
   set cotacao_euro = 6.057, preco_euro = round(valor_unit / 6.057, 4)
 where id in (23841,23842) and nf = 35812 and cotacao_euro = 5.057;

-- 5) € que não bate com R$ ÷ cotação (cotação certa, preço digitado errado).
--    Bom Sabor, NF 33864: € 6,13 → 712,75 ÷ 6,3232 = € 112,72, o preço fixo dela.
update vendas
   set preco_euro = round(valor_unit / cotacao_euro, 4)
 where id = 20270 and nf = 33864 and preco_euro < 7;
--    Ourilândia, NF 34292: € 6,167 (a própria cotação) → 643,56 ÷ 6,167.
update vendas
   set preco_euro = round(valor_unit / cotacao_euro, 4)
 where id = 21053 and nf = 34292 and preco_euro < 7;

-- NFs 32391 (Fleury) e 33317 (TB Laticínios) parecem ter o produto trocado
-- na linha, mas ficam como estão: decisão do usuário em 09/10/2026 de não
-- mexer nas notas. Na tela Comparação elas já ficam fora da faixa de €
-- (preço a mais de 40% do normal do produto).

-- Conferência: deve voltar 27 linhas, todas com "confere" = true.
select id, data, nf, cliente, produto, valor_unit, cotacao_euro, preco_euro,
       abs(valor_unit / cotacao_euro - preco_euro) < 0.01 as confere
  from vendas
 where id in (22265,22266,22268,22269,22271,22272,22273,22274,22275,22276,22277,22278,22279,22280,
              22313,23456,23457,23458,23459,23460,23461,23462,23463,23841,23842,20270,21053)
 order by data, nf, id;
