-- ============================================================
--  INVERSÃO: lista de PERMISSÃO -> lista de OCULTOS
--  Rode no SQL Editor do Supabase ANTES de o deploy subir.
--
--  Antes: `usuarios.vendedores` dizia quem o usuário PODE ver.
--         Vazio = vê todos. Para esconder 1, era preciso listar
--         todos os outros — e vendedor novo não aparecia sozinho.
--
--  Agora: `usuarios.vendedores_ocultos` diz quem o usuário NÃO vê.
--         Vazio = vê todos, inclusive os que entrarem depois.
--
--  Rode os 3 passos de uma vez (o editor aceita o script inteiro).
-- ============================================================

-- 1) Coluna nova. Default vazio = ninguém oculto = vê todos.
alter table usuarios
  add column if not exists vendedores_ocultos text[] default '{}';

-- 2) Garante que ninguém fique com NULL (NULL não é o mesmo que vazio).
update usuarios
   set vendedores_ocultos = '{}'
 where vendedores_ocultos is null;

-- 3) Converte a permissão antiga em ocultos, sem depender de e-mail:
--    para quem tinha lista de permissão, oculto = todos os vendedores
--    que existem em `vendas` e que NÃO estavam na lista dele.
update usuarios u
   set vendedores_ocultos = coalesce((
         select array_agg(distinct v.vendedor order by v.vendedor)
           from vendas v
          where v.vendedor is not null
            and not (v.vendedor = any(u.vendedores))
       ), '{}')
 where u.vendedores is not null
   and array_length(u.vendedores, 1) > 0;

-- A coluna antiga `vendedores` fica parada de propósito: o código novo
-- não lê mais ela, e ela serve de rede se precisar reverter. Depois de
-- alguns dias no ar, dá para remover com:
--   alter table usuarios drop column vendedores;

-- ============================================================
--  CONFERÊNCIA — esperado:
--    Administrador  {}           (vendedores = {}, nada oculto)
--    Romulo         {CLAMALU}    (era permissão p/ THIAGO,WENDEL,CLEBER,YGOR,MAICON)
-- ============================================================
select nome, role, vendedores as permissao_antiga, vendedores_ocultos as ocultos
  from usuarios
 order by nome;
