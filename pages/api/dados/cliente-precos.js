import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth, aplicarFiltroVendedor } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'
import { mediana } from '../../../lib/precos'

// Todas as compras de UM cliente, de todos os anos, para o comparativo entre
// anos da tela Cliente. Ignora o filtro de ano da tela de propósito: o
// comparativo precisa dos dois anos mesmo quando a tela está filtrada em um.
export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('cliente')) return res.status(403).json({ error: 'Sem acesso' })
  const cliente = req.query.cliente
  if (!cliente) return res.status(400).json({ error: 'cliente obrigatório' })

  const db = supabaseAdmin()
  const vends = (req.query.vendedor || '').split(',').filter(Boolean)

  let compras, cot, ult
  try {
    compras = await selectAll(() => {
      let q = db.from('vendas').select('data,ano,mes,nf,produto,qtde,valor_unit,valor_total,cotacao_euro,preco_euro').eq('cliente', cliente)
      return aplicarFiltroVendedor(q, req.user, vends)
    })
    const anos = [...new Set(compras.map(r => r.ano).filter(Boolean))]
    // cotação de todo mundo nesses anos, para achar a cotação fora do padrão
    cot = anos.length ? await selectAll(() => db.from('vendas').select('ano,mes,cotacao_euro').in('ano', anos).not('cotacao_euro', 'is', null)) : []
    // último mês carregado na base: limita o ano corrente a um período comparável
    const { data, error } = await db.from('vendas').select('ano,mes').order('data', { ascending: false }).limit(1)
    if (error) throw new Error(error.message)
    ult = data?.[0] || null
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const porMes = {}
  for (const r of cot) (porMes[r.ano + '-' + r.mes] ??= []).push(r.cotacao_euro)
  const cotMediana = Object.fromEntries(Object.entries(porMes).map(([k, v]) => [k, mediana(v)]))

  return res.status(200).json({ compras, cotMediana, ultimo: ult })
})
