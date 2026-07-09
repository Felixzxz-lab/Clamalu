import { requireAdmin } from '../../../lib/auth'
import { parseDespesasMatriz, anoDaAba } from '../../../lib/despesas'
import * as XLSX from 'xlsx'

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }

// Lê o arquivo de DESPESAS e devolve uma PRÉVIA por aba (sem gravar no banco),
// para o admin conferir ano, meses, total e distribuição antes de importar.
export default requireAdmin(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { fileData } = req.body
    if (!fileData) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const buf = Buffer.from(fileData, 'base64')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

    const abas = wb.SheetNames.map(nome => {
      const matriz = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: null })
      const ano = anoDaAba(nome)
      const { registros, erro } = parseDespesasMatriz(matriz, ano)

      if (erro) return { nome, erro, ok: false }

      const total = registros.reduce((s, r) => s + r.valor, 0)
      const meses = [...new Set(registros.map(r => r.mes))].sort((a, b) => a - b)
      const fornecedores = new Set(registros.map(r => r.despesa)).size
      const grupos = {}
      registros.forEach(r => { grupos[r.grupo] = (grupos[r.grupo] || 0) + r.valor })

      return {
        nome, ok: true, ano,
        totalRegistros: registros.length,
        fornecedores,
        meses,
        total: Math.round(total * 100) / 100,
        grupos: Object.entries(grupos).map(([g, v]) => ({ grupo: g, valor: Math.round(v * 100) / 100 }))
          .sort((a, b) => b.valor - a.valor),
        amostra: registros.slice(0, 8),
      }
    })

    return res.status(200).json({ abas })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
