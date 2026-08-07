import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

// Opções dos filtros lidas da própria tabela `vendas`, para que um vendedor
// novo (ou um ano novo) apareça sozinho, sem precisar editar constante no código.
// Cache curto em memória: a base só muda quando o admin importa uma planilha.
let cache = null
const TTL = 5 * 60 * 1000

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
    // Só entra quem tem venda lançada. Vendedor contratado mas sem nota ainda
    // não aparece em filtro nenhum — aparece sozinho na primeira importação
    // que trouxer uma linha dele.
    vendedores: [...new Set(linhas.map(r => r.vendedor).filter(Boolean))].sort(),
    anos: [...new Set(linhas.map(r => r.ano).filter(Boolean))].sort((a, b) => a - b).map(String),
  }

  cache = { em: Date.now(), dados }
  return res.status(200).json(dados)
})
