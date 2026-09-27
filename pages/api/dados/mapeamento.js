import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

// Linhas do mapeamento de mercado de uma categoria. São poucas centenas, então
// vão inteiras e as agregações (com os filtros de UF/queijo/distribuidor) são
// feitas na tela, com as funções de lib/mapeamento.js.
// O mapeamento não tem vendedor: quem tem a página vê tudo.
const PAGINA = { cultura: 'culturas', enzima: 'enzimas' }

export default requireAuth(async function handler(req, res) {
  const categoria = req.query.categoria
  if (!PAGINA[categoria]) return res.status(400).json({ error: 'Categoria inválida' })
  if (!req.user.paginas?.includes(PAGINA[categoria])) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  try {
    const linhas = await selectAll(() => db.from('mapeamento')
      .select('empresa,company_group,cidade,uf,tipo_queijo,leite_litros_ano,queijo_kg_ano,apresentacao,agente,marca,distribuidor,sem_produto_comercial,carregado_em')
      .eq('categoria', categoria))
    const carregadoEm = linhas.reduce((m, l) => (!m || l.carregado_em > m) ? l.carregado_em : m, null)
    return res.status(200).json({ linhas: linhas.map(({ carregado_em, ...l }) => ({
      ...l,
      leite_litros_ano: l.leite_litros_ano == null ? null : Number(l.leite_litros_ano),
      queijo_kg_ano: l.queijo_kg_ano == null ? null : Number(l.queijo_kg_ano),
    })), carregadoEm })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
