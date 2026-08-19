import { supabaseAdmin } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/auth'
import { parseDespesasMatriz, anoDaAba } from '../../../lib/despesas'
import * as XLSX from 'xlsx'

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }

// Importa a planilha de DESPESAS (formato matriz) para a tabela `despesas`.
// Estrategia: substitui por ANO+MES — apaga so os meses que existem no arquivo
// e regrava. Re-subir a planilha do ano inteiro continua atualizando sem
// duplicar, e subir o resumo de UM mes nao apaga os meses anteriores
// (o arquivo "DESPESAS GERAIS JUL-26" so tem a coluna JUL).
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { fileData, fileName, sheets } = req.body
    if (!fileData) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const buf = Buffer.from(fileData, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

    const abas = (sheets && sheets.length ? sheets : [wb.SheetNames[0]])
      .filter(n => wb.SheetNames.includes(n))
    if (!abas.length) return res.status(400).json({ error: 'Nenhuma aba válida selecionada' })

    let registros = []
    for (const nome of abas) {
      const matriz = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: null })
      const { registros: regs, erro } = parseDespesasMatriz(matriz, anoDaAba(nome))
      if (erro) return res.status(400).json({ error: `Aba "${nome}": ${erro}` })
      registros = registros.concat(regs)
    }
    if (!registros.length) return res.status(400).json({ error: 'Nenhum lançamento encontrado nas abas selecionadas' })

    const db = supabaseAdmin()
    const anos = [...new Set(registros.map(r => r.ano))]
    const periodos = [...new Set(registros.map(r => r.ano + '-' + r.mes))]
      .map(k => k.split('-').map(Number))

    // registra o upload
    const { data: upload } = await db.from('uploads').insert({
      nome_arquivo: '[DESPESAS] ' + (fileName || 'despesas.ods') + ' [' + abas.join(', ') + ']',
      total_linhas: registros.length,
      enviado_por: req.user.email
    }).select().single()

    // substitui so os meses presentes no arquivo
    for (const [ano, mes] of periodos) {
      await db.from('despesas').delete().eq('ano', ano).eq('mes', mes)
    }

    const comUpload = registros.map(r => ({ ...r, upload_id: upload?.id }))
    const BATCH = 500
    for (let i = 0; i < comUpload.length; i += BATCH) {
      const { error } = await db.from('despesas').insert(comUpload.slice(i, i + BATCH))
      if (error) throw new Error(error.message)
    }

    const total = registros.reduce((s, r) => s + r.valor, 0)
    const meses = periodos.map(([a, m]) => a + '/' + String(m).padStart(2, '0')).sort()
    return res.status(200).json({ ok: true, total: registros.length, anos, meses, valorTotal: Math.round(total * 100) / 100, abas })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
