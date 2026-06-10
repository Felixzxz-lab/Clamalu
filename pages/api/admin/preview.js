import { requireAdmin } from '../../../lib/auth'
import { mapRow, isVazia } from '../../../lib/planilha'
import * as XLSX from 'xlsx'

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }

// Lê o arquivo e devolve uma PRÉVIA por aba (sem gravar nada no banco),
// para o admin conferir colunas, contagens e amostra antes de importar.
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { fileData } = req.body
    if (!fileData) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const buf = Buffer.from(fileData, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

    const abas = wb.SheetNames.map(nome => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: null })
      const colunas = Object.keys(rows[0] || {})
      const mapeadas = rows.map(mapRow).filter(v => !isVazia(v))

      const clientes = new Set()
      let valorTotal = 0, semData = 0
      let minData = null, maxData = null
      for (const v of mapeadas) {
        if (v.cliente) clientes.add(v.cliente.trim().toUpperCase())
        valorTotal += v.valor_total || 0
        if (!v.data) semData++
        else {
          if (!minData || v.data < minData) minData = v.data
          if (!maxData || v.data > maxData) maxData = v.data
        }
      }

      return {
        nome,
        totalLinhas: mapeadas.length,
        colunas,
        clientesDistintos: clientes.size,
        valorTotal: Math.round(valorTotal * 100) / 100,
        semData,
        periodo: minData && maxData ? { de: minData, ate: maxData } : null,
        amostra: mapeadas.slice(0, 8).map(v => ({
          data: v.data, cliente: v.cliente, cidade: v.cidade, uf: v.uf,
          produto: v.produto, qtde: v.qtde, valor_total: v.valor_total, vendedor: v.vendedor
        }))
      }
    })

    return res.status(200).json({ abas })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
