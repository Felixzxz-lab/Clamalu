-- ============================================================
--  PERMISSÃO DE RESPONSÁVEIS (VENDEDORES) POR USUÁRIO
--  Rode no SQL Editor do Supabase. É ADITIVO e seguro.
-- ============================================================

-- Quais vendedores/responsáveis cada usuário pode ver nos filtros.
-- Array VAZIO = sem restrição (vê TODOS os responsáveis).
alter table usuarios
  add column if not exists vendedores text[] default '{}';

-- (opcional) exemplo: restringir um usuário a ver só WENDEL
-- update usuarios set vendedores = array['WENDEL'] where email = 'fulano@cliente.com';
