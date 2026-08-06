import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('financeiro')) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  const anos = (req.query.ano || '').split(',').filter(Boolean).map(Number)
  const meses = (req.query.mes || '').split(',').filter(Boolean).map(Number)
  const grupos = (req.query.grupo || '').split(',').filter(Boolean)

  let data
  try {
    data = await selectAll(() => {
      let q = db.from('despesas').select('despesa,categoria,grupo,ano,mes,valor')
      if (anos.length) q = q.in('ano', anos)
      if (meses.length) q = q.in('mes', meses)
      if (grupos.length) q = q.in('grupo', grupos)
      return q
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const totalValor = data.reduce((s, r) => s + Number(r.valor), 0)
  const mesesDistintos = new Set(data.map(r => r.ano + '-' + r.mes)).size || 1
  const fornecedores = new Set(data.map(r => r.despesa)).size

  // Por grupo
  const grpMap = {}
  data.forEach(r => { grpMap[r.grupo] = (grpMap[r.grupo] || 0) + Number(r.valor) })
  const porGrupo = Object.entries(grpMap).map(([g, v]) => ({
    grupo: g, valor: Math.round(v * 100) / 100,
    pct: totalValor > 0 ? Math.round(v / totalValor * 1000) / 10 : 0
  })).sort((a, b) => b.valor - a.valor)

  // Evolução mensal (soma por mês, 1..12) — total e operacional (sem Revenda/Mercadoria)
  const isRevenda = g => /revenda/i.test(g || '')
  const mesMap = {}, mesMapOper = {}
  data.forEach(r => {
    mesMap[r.mes] = (mesMap[r.mes] || 0) + Number(r.valor)
    if (!isRevenda(r.grupo)) mesMapOper[r.mes] = (mesMapOper[r.mes] || 0) + Number(r.valor)
  })
  const totalOper = data.reduce((s, r) => s + (isRevenda(r.grupo) ? 0 : Number(r.valor)), 0)

  // Faturamento (vendas) por mês — cruza com as despesas para a representatividade
  const anosFat = [...new Set(data.map(r => r.ano))]
  let vendas = []
  try {
    if (anosFat.length) vendas = await selectAll(() => {
      let q = db.from('vendas').select('valor_total,mes').in('ano', anosFat)
      if (meses.length) q = q.in('mes', meses)
      return q
    })
  } catch (e) { vendas = [] }
  const fatMap = {}
  vendas.forEach(r => { fatMap[r.mes] = (fatMap[r.mes] || 0) + Number(r.valor_total) })
  const totalFat = vendas.reduce((s, r) => s + Number(r.valor_total), 0)
  // peso de cada grupo sobre o faturamento
  porGrupo.forEach(g => { g.pctFat = totalFat > 0 ? Math.round(g.valor / totalFat * 1000) / 10 : null })

  // 12 posições (jan..dez) agregando os anos que passaram pelo filtro. Despesa e
  // faturamento usam o mesmo conjunto de anos (`anosFat`), então a representatividade
  // fecha; mas com 2+ anos selecionados uma barra soma os dois. O dashboard entra
  // filtrado no ano mais recente justamente para não cair nesse caso sem avisar.
  const porMes = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const desp = Math.round((mesMap[m] || 0) * 100) / 100
    const despOper = Math.round((mesMapOper[m] || 0) * 100) / 100
    const fat = Math.round((fatMap[m] || 0) * 100) / 100
    return {
      mes: m, valor: desp, valorOper: despOper, faturamento: fat,
      representatividade: fat > 0 ? Math.round(desp / fat * 10000) / 100 : null,
      representatividadeOper: fat > 0 ? Math.round(despOper / fat * 10000) / 100 : null
    }
  })

  // Top fornecedores
  const fMap = {}
  data.forEach(r => {
    if (!fMap[r.despesa]) fMap[r.despesa] = { grupo: r.grupo, categoria: r.categoria, valor: 0 }
    fMap[r.despesa].valor += Number(r.valor)
  })
  const topFornecedores = Object.entries(fMap).map(([d, o]) => ({
    despesa: d, grupo: o.grupo, categoria: o.categoria,
    valor: Math.round(o.valor * 100) / 100,
    pct: totalValor > 0 ? Math.round(o.valor / totalValor * 10000) / 100 : 0
  })).sort((a, b) => b.valor - a.valor)

  // linhas detalhadas para o realce cruzado no front
  const linhas = data.map(r => ({
    despesa: r.despesa, categoria: r.categoria, grupo: r.grupo, mes: r.mes, valor: Number(r.valor)
  }))

  // opções distintas para os filtros
  const opcoes = {
    anos: [...new Set(data.map(r => r.ano))].sort(),
    grupos: [...new Set(data.map(r => r.grupo))].sort(),
  }

  return res.status(200).json({
    kpis: {
      valor: Math.round(totalValor * 100) / 100,
      mediaMes: Math.round(totalValor / mesesDistintos * 100) / 100,
      fornecedores,
      maiorGrupo: porGrupo[0]?.grupo || '—',
      faturamento: Math.round(totalFat * 100) / 100,
      valorOper: Math.round(totalOper * 100) / 100,
      representatividade: totalFat > 0 ? Math.round(totalValor / totalFat * 10000) / 100 : null,
      representatividadeOper: totalFat > 0 ? Math.round(totalOper / totalFat * 10000) / 100 : null,
    },
    porGrupo, porMes, topFornecedores, linhas, opcoes
  })
})
