import { supabaseAdmin } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/auth'
import * as XLSX from 'xlsx'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { fileData, fileName } = req.body
    if (!fileData) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    // fileData vem como base64
    const buf = Buffer.from(fileData, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null })

    const db = supabaseAdmin()

    const { data: upload } = await db.from('uploads').insert({
      nome_arquivo: fileName || 'planilha.xlsx',
      total_linhas: rows.length,
      enviado_por: req.user.email
    }).select().single()

    // Limpar dados anteriores
    await db.from('vendas').delete().neq('id', 0)

    const vendas = rows.map(r => {
      let data = null
      if (r['DATA']) {
        const d = new Date(r['DATA'])
        if (!isNaN(d)) data = d.toISOString().split('T')[0]
      }
      return {
        nf: r['N.F'] || null,
        data,
        cliente: r['CLIENTE'] || null,
        cidade: r['CIDADE'] || null,
        uf: r['UF'] || null,
        produto: r['PRODUTO'] || null,
        empresa: r['EMPRESA'] || null,
        qtde: parseInt(r['QTDE']) || 0,
        valor_unit: parseFloat(r['VALOR UNIT.']) || 0,
        valor_total: parseFloat(r['VALOR TOTAL']) || 0,
        fatura_total: parseFloat(r['FATURA TOTAL']) || 0,
        vendedor: r['VENDEDOR'] || null,
        ano: data ? parseInt(data.split('-')[0]) : null,
        mes: data ? parseInt(data.split('-')[1]) : null,
        upload_id: upload?.id
      }
    }).filter(v => v.data && v.valor_total > 0)

    const BATCH = 500
    for (let i = 0; i < vendas.length; i += BATCH) {
      const { error } = await db.from('vendas').insert(vendas.slice(i, i + BATCH))
      if (error) throw new Error(error.message)
    }

    return res.status(200).json({ ok: true, total: vendas.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
