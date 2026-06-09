import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('produto')) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  const { ano, mes, vendedor } = req.query

  let q = db.from('vendas').select('produto,uf,qtde,valor_total,ano,mes,vendedor')
  if (ano) q = q.eq('ano', parseInt(ano))
  if (mes) q = q.eq('mes', parseInt(mes))
  if (vendedor) q = q.eq('vendedor', vendedor)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })

  const totalValor = data.reduce((s, r) => s + r.valor_total, 0)
  const totalQtde = data.reduce((s, r) => s + r.qtde, 0)

  // Produto x UF
  const prodUfMap = {}
  data.forEach(r => {
    if (!prodUfMap[r.produto]) prodUfMap[r.produto] = {}
    if (!prodUfMap[r.produto][r.uf]) prodUfMap[r.produto][r.uf] = 0
    prodUfMap[r.produto][r.uf] += r.valor_total
  })

  const prodTotais = {}
  Object.entries(prodUfMap).forEach(([p, ufs]) => {
    prodTotais[p] = Object.values(ufs).reduce((s, v) => s + v, 0)
  })

  const prodUf = Object.entries(prodUfMap).map(([produto, ufs]) => ({
    produto,
    total: prodTotais[produto],
    ufs: Object.entries(ufs).map(([uf, val]) => ({
      uf, valor: Math.round(val * 100) / 100,
      pct: Math.round(val / prodTotais[produto] * 1000) / 10
    })).sort((a, b) => b.pct - a.pct)
  })).sort((a, b) => b.total - a.total)

  // UF geral
  const ufMap = {}
  data.forEach(r => {
    if (!ufMap[r.uf]) ufMap[r.uf] = { qtde: 0, valor: 0 }
    ufMap[r.uf].qtde += r.qtde
    ufMap[r.uf].valor += r.valor_total
  })
  const ufTotal = Object.entries(ufMap).map(([uf, d]) => ({
    uf, qtde: d.qtde, valor: Math.round(d.valor * 100) / 100,
    pct: Math.round(d.valor / totalValor * 1000) / 10
  })).sort((a, b) => b.valor - a.valor)

  // Ranking produtos
  const prodRank = prodUf.map(p => ({
    produto: p.produto,
    valor: Math.round(p.total * 100) / 100,
    pct: Math.round(p.total / totalValor * 1000) / 10,
    qtde: data.filter(r => r.produto === p.produto).reduce((s, r) => s + r.qtde, 0)
  }))

  return res.status(200).json({
    kpis: { qtde: totalQtde, valor: Math.round(totalValor * 100) / 100 },
    prodUf: prodUf.slice(0, 10),
    ufTotal,
    tabelaProdutos: prodRank,
    top5Valor: prodRank.slice(0, 5),
    top5Qtde: [...prodRank].sort((a, b) => b.qtde - a.qtde).slice(0, 5)
  })
})
