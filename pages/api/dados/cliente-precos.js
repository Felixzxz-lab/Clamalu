import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth, aplicarFiltroVendedor } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'
import { mediana } from '../../../lib/precos'

// Mediana da cotação por mês: igual para todo cliente e só muda quando o admin
// importa planilha. Cache curto em memória, como em opcoes.js.
let cacheCot = null
const TTL = 5 * 60 * 1000

// Todas as compras de UM cliente, de todos os anos, para o comparativo entre
// anos da tela Cliente. Ignora o filtro de ano da tela de propósito: o
// comparativo precisa dos dois anos mesmo quando a tela está filtrada em um.
export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('cliente')) return res.status(403).json({ error: 'Sem acesso' })
  const cliente = req.query.cliente
  if (!cliente) return res.status(400).json({ error: 'cliente obrigatório' })

  const db = supabaseAdmin()
  const vends = (req.query.vendedor || '').split(',').filter(Boolean)

  let compras
  try {
    const atualizarCot = async () => {
      if (cacheCot && Date.now() - cacheCot.em < TTL) return
      // cotação de todo mundo, para achar a cotação fora do padrão do mês
      const [cot, u] = await Promise.all([
        selectAll(() => db.from('vendas').select('ano,mes,cotacao_euro').not('cotacao_euro', 'is', null)),
        // último mês carregado na base: limita o ano corrente a um período comparável
        db.from('vendas').select('ano,mes').order('data', { ascending: false }).limit(1),
      ])
      if (u.error) throw new Error(u.error.message)
      const porMes = {}
      for (const r of cot) (porMes[r.ano + '-' + r.mes] ??= []).push(r.cotacao_euro)
      cacheCot = { em: Date.now(), cotMediana: Object.fromEntries(Object.entries(porMes).map(([k, v]) => [k, mediana(v)])), ultimo: u.data?.[0] || null }
    }
    ;[compras] = await Promise.all([
      selectAll(() => {
        const q = db.from('vendas').select('data,ano,mes,nf,produto,qtde,valor_unit,valor_total,cotacao_euro,preco_euro').eq('cliente', cliente)
        return aplicarFiltroVendedor(q, req.user, vends)
      }),
      atualizarCot(),
    ])
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  return res.status(200).json({ compras, cotMediana: cacheCot.cotMediana, ultimo: cacheCot.ultimo })
})
