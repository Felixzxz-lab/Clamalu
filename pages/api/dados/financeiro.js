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

  // Evolução mensal (soma por mês, 1..12)
  const mesMap = {}
  data.forEach(r => { mesMap[r.mes] = (mesMap[r.mes] || 0) + Number(r.valor) })
  const porMes = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1, valor: Math.round((mesMap[i + 1] || 0) * 100) / 100
  }))

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
    },
    porGrupo, porMes, topFornecedores, linhas, opcoes
  })
})
