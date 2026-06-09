import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('comparacao')) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  const { anos, meses, vendedor } = req.query

  const anosArr = anos ? anos.split(',').map(Number) : [2025, 2026]
  const mesesArr = meses ? meses.split(',').map(Number) : null

  let q = db.from('vendas').select('ano,mes,vendedor,qtde,valor_total').in('ano', anosArr)
  if (mesesArr?.length) q = q.in('mes', mesesArr)
  if (vendedor) q = q.eq('vendedor', vendedor)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })

  // Mensal por ano
  const mensal = {}
  anosArr.forEach(a => { mensal[a] = {} })
  data.forEach(r => {
    if (!mensal[r.ano]) mensal[r.ano] = {}
    if (!mensal[r.ano][r.mes]) mensal[r.ano][r.mes] = { valor: 0, qtde: 0 }
    mensal[r.ano][r.mes].valor += r.valor_total
    mensal[r.ano][r.mes].qtde += r.qtde
  })

  // Por vendedor por mês
  const vendMes = {}
  data.forEach(r => {
    if (!vendMes[r.vendedor]) vendMes[r.vendedor] = {}
    if (!vendMes[r.vendedor][r.ano]) vendMes[r.vendedor][r.ano] = {}
    if (!vendMes[r.vendedor][r.ano][r.mes]) vendMes[r.vendedor][r.ano][r.mes] = 0
    vendMes[r.vendedor][r.ano][r.mes] += r.valor_total
  })

  // Totais por ano
  const totaisPorAno = {}
  anosArr.forEach(a => {
    totaisPorAno[a] = {
      valor: data.filter(r => r.ano === a).reduce((s, r) => s + r.valor_total, 0),
      qtde: data.filter(r => r.ano === a).reduce((s, r) => s + r.qtde, 0)
    }
  })

  return res.status(200).json({ mensal, vendMes, totaisPorAno, anos: anosArr })
})
