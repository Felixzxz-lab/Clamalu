import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('vendedor')) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  const { ano, mes, vendedor } = req.query

  let data
  try {
    data = await selectAll(() => {
      let q = db.from('vendas').select('vendedor,cliente,uf,produto,qtde,valor_total,ano,mes')
      if (ano) q = q.eq('ano', parseInt(ano))
      if (mes) q = q.eq('mes', parseInt(mes))
      if (vendedor) q = q.eq('vendedor', vendedor)
      return q
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const totalValor = data.reduce((s, r) => s + r.valor_total, 0)
  const totalQtde = data.reduce((s, r) => s + r.qtde, 0)
  const totalClientes = new Set(data.map(r => r.cliente)).size

  // Por vendedor
  const vendMap = {}
  data.forEach(r => {
    if (!vendMap[r.vendedor]) vendMap[r.vendedor] = { valor: 0, qtde: 0, clientes: new Set() }
    vendMap[r.vendedor].valor += r.valor_total
    vendMap[r.vendedor].qtde += r.qtde
    vendMap[r.vendedor].clientes.add(r.cliente)
  })
  const porVendedor = Object.entries(vendMap).map(([v, d]) => ({
    vendedor: v, valor: Math.round(d.valor * 100) / 100,
    pct: Math.round(d.valor / totalValor * 1000) / 10,
    qtde: d.qtde, clientes: d.clientes.size
  })).sort((a, b) => b.valor - a.valor)

  // Top 5 produtos por qtde
  const prodMap = {}
  data.forEach(r => {
    if (!prodMap[r.produto]) prodMap[r.produto] = { qtde: 0, valor: 0 }
    prodMap[r.produto].qtde += r.qtde
    prodMap[r.produto].valor += r.valor_total
  })
  const topProdQtde = Object.entries(prodMap).map(([p, d]) => ({ produto: p, ...d }))
    .sort((a, b) => b.qtde - a.qtde).slice(0, 5)
  const topProdValor = Object.entries(prodMap).map(([p, d]) => ({ produto: p, ...d }))
    .sort((a, b) => b.valor - a.valor).slice(0, 5)

  // Tabela clientes
  const cliMap = {}
  data.forEach(r => {
    if (!cliMap[r.cliente]) cliMap[r.cliente] = { uf: r.uf, qtd: 0, valor: 0 }
    cliMap[r.cliente].qtd += r.qtde
    cliMap[r.cliente].valor += r.valor_total
  })
  const tabelaClientes = Object.entries(cliMap).map(([c, d]) => ({
    cliente: c, uf: d.uf, qtd: d.qtd,
    valor: Math.round(d.valor * 100) / 100,
    pct: Math.round(d.valor / totalValor * 10000) / 100
  })).sort((a, b) => b.valor - a.valor).slice(0, 10)

  // Tabela produtos
  const tabelaProdutos = Object.entries(prodMap).map(([p, d]) => ({
    produto: p, qtde: d.qtde,
    valor: Math.round(d.valor * 100) / 100,
    pct: Math.round(d.valor / totalValor * 10000) / 100
  })).sort((a, b) => b.valor - a.valor).slice(0, 10)

  return res.status(200).json({
    kpis: { qtde: totalQtde, valor: Math.round(totalValor * 100) / 100, clientes: totalClientes },
    porVendedor, topProdQtde, topProdValor, tabelaClientes, tabelaProdutos
  })
})
