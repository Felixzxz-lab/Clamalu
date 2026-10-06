// Preço médio em euro por produto, separado entre os clientes que formam 70%
// do faturamento e os 30% restantes (pedido do cliente em 05/10/2026).
// Puro, sem React.
//
// - O corte dos 70% é o mesmo da tela de Cliente (curva sobre o acumulado do
//   ano, lib/periodo.js), para os nomes baterem entre as duas telas.
// - Média ponderada pela quantidade: um pedido de 80 unidades pesa mais que um
//   de 1. Só entram linhas com preco_euro (produto vendido em real fica fora).

import { recortes, somaPor, curva } from './periodo'

export function precoEuroPorFaixa(linhas) {
  const per = recortes(linhas)
  const ranking = somaPor(per.acum, 'cliente')
  const top = new Set(curva(ranking, 70).map(c => c.chave))

  const m = {}
  for (const r of per.acum) {
    if (!(r.preco_euro > 0) || !(r.qtde > 0)) continue
    const f = top.has(r.cliente) ? 'f70' : 'f30'
    m[r.produto] ??= { produto: r.produto, valor: 0, f70: { q: 0, e: 0, cli: new Set() }, f30: { q: 0, e: 0, cli: new Set() } }
    const p = m[r.produto], g = p[f]
    g.q += r.qtde; g.e += r.preco_euro * r.qtde; g.cli.add(r.cliente)
    p.valor += r.valor_total
  }
  const faixa = g => g.q ? { media: Math.round(g.e / g.q * 100) / 100, qtde: g.q, clientes: g.cli.size } : null

  return {
    rotulo: per.rotuloAcum,
    clientes70: top.size,
    clientesTotal: ranking.length,
    produtos: Object.values(m)
      .sort((a, b) => b.valor - a.valor)
      .map(p => ({ produto: p.produto, f70: faixa(p.f70), f30: faixa(p.f30) })),
  }
}
