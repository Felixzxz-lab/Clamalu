import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('cliente')) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  const { ano, mes, vendedor } = req.query

  let data
  try {
    data = await selectAll(() => {
      let q = db.from('vendas').select('cliente,uf,cidade,qtde,valor_total,ano,mes,vendedor')
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

  // Ranking clientes
  const cliMap = {}
  data.forEach(r => {
    if (!cliMap[r.cliente]) cliMap[r.cliente] = { uf: r.uf, cidade: r.cidade, qtd: 0, valor: 0 }
    cliMap[r.cliente].qtd += r.qtde
    cliMap[r.cliente].valor += r.valor_total
  })
  const ranking = Object.entries(cliMap).map(([c, d]) => ({
    cliente: c, uf: d.uf, cidade: d.cidade, qtd: d.qtd,
    valor: Math.round(d.valor * 100) / 100,
    pct: Math.round(d.valor / totalValor * 10000) / 100
  })).sort((a, b) => b.valor - a.valor)

  // Acumulado para 30% e 50%
  let acum = 0
  const cli30 = [], cli50 = []
  for (const c of ranking) {
    acum += c.pct
    c.acumulado = Math.round(acum * 100) / 100
    if (acum <= 32) cli30.push(c)
    if (acum <= 52) cli50.push(c)
  }

  // % por mês por cliente (top 5)
  const top5Cli = ranking.slice(0, 5).map(c => c.cliente)
  const mesMes = {}
  data.forEach(r => {
    const k = `${r.ano}-${String(r.mes).padStart(2,'0')}`
    if (!mesMes[k]) mesMes[k] = { total: 0, clientes: {} }
    mesMes[k].total += r.valor_total
    if (top5Cli.includes(r.cliente)) {
      if (!mesMes[k].clientes[r.cliente]) mesMes[k].clientes[r.cliente] = 0
      mesMes[k].clientes[r.cliente] += r.valor_total
    }
  })
  const mesesOrdenados = Object.keys(mesMes).sort()
  const cliMesPct = {}
  top5Cli.forEach(c => {
    cliMesPct[c] = mesesOrdenados.map(m => {
      const tot = mesMes[m].total
      const val = mesMes[m].clientes[c] || 0
      return { mes: m, pct: tot > 0 ? Math.round(val / tot * 1000) / 10 : 0, valor: Math.round(val * 100) / 100 }
    })
  })

  // UF
  const ufMap = {}
  data.forEach(r => {
    if (!ufMap[r.uf]) ufMap[r.uf] = { qtde: 0, valor: 0, clientes: new Set() }
    ufMap[r.uf].qtde += r.qtde
    ufMap[r.uf].valor += r.valor_total
    ufMap[r.uf].clientes.add(r.cliente)
  })
  const ufTotal = Object.entries(ufMap).map(([uf, d]) => ({
    uf, qtde: d.qtde, valor: Math.round(d.valor * 100) / 100,
    pct: Math.round(d.valor / totalValor * 1000) / 10,
    clientes: d.clientes.size
  })).sort((a, b) => b.valor - a.valor)

  const linhas = data.map(r => ({ cliente: r.cliente, uf: r.uf, cidade: r.cidade, vendedor: r.vendedor, qtde: r.qtde, valor_total: r.valor_total }))

  return res.status(200).json({
    kpis: { qtde: totalQtde, valor: Math.round(totalValor * 100) / 100, clientes: totalClientes },
    ranking: ranking.slice(0, 20),
    cli30, cli50,
    cliMesPct, meses: mesesOrdenados,
    top5Cli, ufTotal, linhas
  })
})
