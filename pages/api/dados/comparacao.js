import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth, filtrarVendedores } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('comparacao')) return res.status(403).json({ error: 'Sem acesso' })

  const db = supabaseAdmin()
  const { anos, meses, vendedor } = req.query

  // Sem `anos` na query não dá para chumbar [2025,2026]: quando virar o ano a
  // tela ficaria comparando anos velhos. Vazio = não filtra; os anos que
  // realmente vieram são derivados do resultado, mais abaixo.
  const anosArr = anos ? anos.split(',').map(Number) : []
  const mesesArr = meses ? meses.split(',').map(Number) : null
  const vends = (vendedor || '').split(',').filter(Boolean)
  const vendsF = filtrarVendedores(req.user, vends) // restrição por responsável

  let data
  try {
    data = await selectAll(() => {
      let q = db.from('vendas').select('ano,mes,vendedor,cliente,produto,uf,qtde,valor_total')
      if (anosArr.length) q = q.in('ano', anosArr)   // vazio = todos os anos
      if (mesesArr?.length) q = q.in('mes', mesesArr)
      if (vendsF.length) q = q.in('vendedor', vendsF)
      return q
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  // Anos que de fato vieram: o pedido, ou o que existe na base quando não veio
  // filtro. Nunca uma lista fixa.
  const anosEfetivos = anosArr.length
    ? anosArr
    : [...new Set(data.map(r => r.ano).filter(Boolean))].sort((a, b) => a - b)

  // Mensal por ano
  const mensal = {}
  anosEfetivos.forEach(a => { mensal[a] = {} })
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
  anosEfetivos.forEach(a => {
    totaisPorAno[a] = {
      valor: data.filter(r => r.ano === a).reduce((s, r) => s + r.valor_total, 0),
      qtde: data.filter(r => r.ano === a).reduce((s, r) => s + r.qtde, 0)
    }
  })

  const linhas = data.map(r => ({ ano: r.ano, mes: r.mes, vendedor: r.vendedor, cliente: r.cliente, produto: r.produto, uf: r.uf, qtde: r.qtde, valor_total: r.valor_total }))

  return res.status(200).json({ mensal, vendMes, totaisPorAno, anos: anosEfetivos, linhas })
})
