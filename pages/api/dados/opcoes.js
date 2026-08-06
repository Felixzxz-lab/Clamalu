import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

// Opções dos filtros lidas da própria tabela `vendas`, para que um vendedor
// novo (ou um ano novo) apareça sozinho, sem precisar editar constante no código.
// Cache curto em memória: a base só muda quando o admin importa uma planilha.
let cache = null
const TTL = 5 * 60 * 1000

// Vendedores já contratados que ainda não têm nota lançada — sem isto eles não
// existiriam no filtro nem no painel Admin, porque a lista vem da tabela `vendas`.
// Assim que a primeira venda entrar, passam a vir do banco e podem sair daqui.
const VENDEDORES_SEM_VENDA = ['MAICON']

export default requireAuth(async function handler(req, res) {
  if (cache && Date.now() - cache.em < TTL) return res.status(200).json(cache.dados)

  const db = supabaseAdmin()
  let linhas
  try {
    linhas = await selectAll(() => db.from('vendas').select('vendedor,ano'))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const dados = {
    vendedores: [...new Set([
      ...linhas.map(r => r.vendedor).filter(Boolean),
      ...VENDEDORES_SEM_VENDA,
    ])].sort(),
    anos: [...new Set(linhas.map(r => r.ano).filter(Boolean))].sort((a, b) => a - b).map(String),
  }

  cache = { em: Date.now(), dados }
  return res.status(200).json(dados)
})
