// Parsing da planilha de vendas — compartilhado entre a prévia e a importação.

function norm(s) {
  return String(s).trim().toUpperCase().replace(/\s+/g, ' ')
}

// Acessor tolerante a espaços/maiúsculas no cabeçalho (ex.: ' VALOR UNIT. ').
export function rowGetter(row) {
  const map = {}
  for (const k of Object.keys(row)) map[norm(k)] = row[k]
  return (name) => map[norm(name)]
}

// Converte DATA em 'YYYY-MM-DD'. Aceita: objeto Date, serial do Excel,
// texto BR 'dd/mm/aa' | 'dd/mm/aaaa' e ISO 'aaaa-mm-dd'.
export function parseData(v) {
  if (v == null || v === '') return null
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString().split('T')[0]
  if (typeof v === 'number') {
    const ms = Math.round((v - 25569) * 86400 * 1000) // serial Excel -> epoch
    const d = new Date(ms)
    return isNaN(d) ? null : d.toISOString().split('T')[0]
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    let [, dd, mm, yy] = m
    if (yy.length === 2) yy = '20' + yy
    return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  const d = new Date(s)
  return isNaN(d) ? null : d.toISOString().split('T')[0]
}

// Converte número aceitando formato BR ('1.248,38') ou US ('1248.38').
// Tolera célula formatada como moeda em texto (' R$ 1.248,38 ', ' € -   '),
// que é como a planilha do cliente costuma vir — sem isso o parseFloat
// falhava e o valor virava 0 silenciosamente.
export function parseNum(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  let s = String(v).replace(/[\s ]/g, '').replace(/^(R\$|US\$|\$|€)/i, '')
  if (s === '' || s === '-') return 0
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function txt(v) {
  return v == null || String(v).trim() === '' ? null : String(v).trim()
}

// Mapeia uma linha da planilha para o registro da tabela `vendas`.
export function mapRow(row) {
  const g = rowGetter(row)
  const data = parseData(g('DATA'))
  return {
    nf: parseInt(g('N.F')) || null,
    data,
    cliente: txt(g('CLIENTE')),
    cidade: txt(g('CIDADE')),
    uf: txt(g('UF')),
    produto: txt(g('PRODUTO')),
    empresa: txt(g('EMPRESA')),
    qtde: Math.round(parseNum(g('QTDE'))) || 0,
    valor_unit: parseNum(g('VALOR UNIT.')),
    valor_total: parseNum(g('VALOR TOTAL')),
    fatura_total: parseNum(g('FATURA TOTAL')),
    vendedor: txt(g('VENDEDOR')),
    ano: data ? parseInt(data.split('-')[0]) : null,
    mes: data ? parseInt(data.split('-')[1]) : null,
  }
}

// Linha "vazia" (sem cliente, sem N.F e sem valor) — não deve ser importada.
export function isVazia(v) {
  return !v.cliente && !v.nf && !v.valor_total
}
