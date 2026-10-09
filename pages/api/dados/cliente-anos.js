import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth, aplicarFiltroVendedor } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'

// Lista de clientes do comparativo entre anos da tela Cliente (o que era o
// "Comparativo por cliente" da Comparação até 08/10/2026): valor de cada
// cliente nos dois anos, no mesmo período. Ignora o filtro de ano da tela,
// porque o comparativo tem os próprios anos.
//
// Período comparável: se o ano comparado é o último da base, os dois anos vão
// só até o último mês carregado (jan–dez contra jan–set faria tudo "cair").
export default requireAuth(async function handler(req, res) {
  if (!req.user.paginas?.includes('cliente')) return res.status(403).json({ error: 'Sem acesso' })

  const anoB = Number(req.query.base), anoC = Number(req.query.comp)
  if (!anoB || !anoC) return res.status(400).json({ error: 'base e comp obrigatórios' })
  const db = supabaseAdmin()
  const vends = (req.query.vendedor || '').split(',').filter(Boolean)
  let meses = (req.query.mes || '').split(',').filter(Boolean).map(Number)
  if (!meses.length) meses = [1,2,3,4,5,6,7,8,9,10,11,12]

  let data, ultimo
  try {
    const { data: u, error } = await db.from('vendas').select('ano,mes').order('data', { ascending: false }).limit(1)
    if (error) throw new Error(error.message)
    ultimo = u?.[0] || null
    if (ultimo && anoC === ultimo.ano) meses = meses.filter(m => m <= ultimo.mes)
    data = meses.length ? await selectAll(() => {
      const q = db.from('vendas').select('cliente,uf,ano,valor_total').in('ano', [anoB, anoC]).in('mes', meses)
      return aplicarFiltroVendedor(q, req.user, vends)
    }) : []
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const m = {}
  for (const r of data) {
    const o = m[r.cliente] ??= { cliente: r.cliente, uf: r.uf, v0: 0, v1: 0 }
    if (r.ano === anoB) o.v0 += r.valor_total; else o.v1 += r.valor_total
  }
  const clientes = Object.values(m)
    .map(o => ({ ...o, v0: Math.round(o.v0 * 100) / 100, v1: Math.round(o.v1 * 100) / 100, varV: o.v0 > 0 && o.v1 > 0 ? (o.v1 - o.v0) / o.v0 * 100 : null }))
    .sort((a, b) => b.v0 - a.v0 || b.v1 - a.v1)

  return res.status(200).json({ meses, clientes })
})
