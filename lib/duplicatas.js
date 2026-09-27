// Trava contra importar a mesma venda duas vezes.
//
// O upload de vendas é acumulativo: soma ao que já existe. Em julho/2026 parte
// da planilha subiu duas vezes e inflou o mês em ~R$ 350 mil (47 linhas, ver
// db/correcoes/2026-09_duplicatas_julho.sql). Aqui, antes de gravar, cada linha
// do arquivo é comparada com o que já está na base.
//
// Chave = NF + data + cliente + produto + quantidade + valor. A comparação é
// por CONTAGEM: uma NF pode ter o mesmo item duas vezes de verdade, então se a
// base tem 1 e o arquivo tem 2 iguais, só 1 é pulada.
import { selectAll } from './db'

export const chaveVenda = v => [
  v.nf ?? '', v.data ?? '', String(v.cliente ?? '').trim().toUpperCase(),
  String(v.produto ?? '').trim().toUpperCase(), v.qtde ?? 0, Number(v.valor_total ?? 0).toFixed(2),
].join('|')

const COLS = 'nf,data,cliente,produto,qtde,valor_total'

// devolve { novas, repetidas } — `repetidas` são as que já estavam na base
export async function separarJaImportadas(db, vendas) {
  const nfs = [...new Set(vendas.map(v => v.nf).filter(n => n != null))]
  const datasSemNf = [...new Set(vendas.filter(v => v.nf == null && v.data).map(v => v.data))]

  const existentes = []
  for (let i = 0; i < nfs.length; i += 200) {
    const lote = nfs.slice(i, i + 200)
    existentes.push(...await selectAll(() => db.from('vendas').select(COLS).in('nf', lote)))
  }
  for (let i = 0; i < datasSemNf.length; i += 200) {
    const lote = datasSemNf.slice(i, i + 200)
    existentes.push(...await selectAll(() => db.from('vendas').select(COLS).is('nf', null).in('data', lote)))
  }

  const naBase = {}
  for (const r of existentes) { const k = chaveVenda(r); naBase[k] = (naBase[k] || 0) + 1 }

  const novas = [], repetidas = []
  for (const v of vendas) {
    const k = chaveVenda(v)
    if (naBase[k] > 0) { naBase[k]--; repetidas.push(v) } else novas.push(v)
  }
  return { novas, repetidas }
}
