import { supabaseAdmin } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/auth'
import { mapRow, isVazia } from '../../../lib/planilha'
import * as XLSX from 'xlsx'

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }

export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { fileData, fileName, sheets, limparAntes } = req.body
    if (!fileData) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const buf = Buffer.from(fileData, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

    // abas a importar: as escolhidas pelo usuário, ou a primeira por padrão
    const abas = (sheets && sheets.length ? sheets : [wb.SheetNames[0]])
      .filter(n => wb.SheetNames.includes(n))
    if (!abas.length) return res.status(400).json({ error: 'Nenhuma aba válida selecionada' })

    // junta as linhas de todas as abas escolhidas
    let brutas = []
    for (const nome of abas) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: null })
      brutas = brutas.concat(rows)
    }

    const vendas = brutas.map(mapRow).filter(v => !isVazia(v))
    if (!vendas.length) return res.status(400).json({ error: 'Nenhuma linha com dados encontrada nas abas selecionadas' })

    const db = supabaseAdmin()

    // opcional: limpar tudo antes (carga limpa). Por padrão acumula.
    if (limparAntes) await db.from('vendas').delete().neq('id', 0)

    const { data: upload } = await db.from('uploads').insert({
      nome_arquivo: (fileName || 'planilha.xlsx') + ' [' + abas.join(', ') + ']',
      total_linhas: vendas.length,
      enviado_por: req.user.email
    }).select().single()

    const comUpload = vendas.map(v => ({ ...v, upload_id: upload?.id }))

    const BATCH = 500
    for (let i = 0; i < comUpload.length; i += BATCH) {
      const { error } = await db.from('vendas').insert(comUpload.slice(i, i + BATCH))
      if (error) throw new Error(error.message)
    }

    return res.status(200).json({ ok: true, total: vendas.length, abas, limpou: !!limparAntes })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
