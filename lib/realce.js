// Helpers do realce cruzado (cross-highlight) — puros, sem React.

// cor "esmaecida" (mesma cor com baixa opacidade)
export function fade(hex, a = '2e') { return (hex && hex.length === 7 ? hex : '#888888') + a }

// soma de uma medida por categoria, restrita ao item realçado (se houver)
export function aggBy(linhas, catKey, measure, sel) {
  const m = {}
  for (const r of linhas) {
    if (sel && r[sel.dim] !== sel.value) continue
    const k = r[catKey]
    m[k] = (m[k] || 0) + (measure === 'qtde' ? r.qtde : r.valor_total)
  }
  return m
}

// a categoria contribui para o item realçado? (tem alguma linha em comum)
export function contribui(linhas, catKey, value, sel) {
  if (!sel) return true
  return linhas.some(r => r[catKey] === value && r[sel.dim] === sel.value)
}

// recalcula uma tabela agrupada por catKey, filtrada pelo item realçado
export function tabelaAgrupada(linhas, catKey, sel) {
  const base = sel ? linhas.filter(r => r[sel.dim] === sel.value) : linhas
  const m = {}; let total = 0
  for (const r of base) {
    const k = r[catKey]
    if (!m[k]) m[k] = { chave: k, uf: r.uf, qtd: 0, valor: 0 }
    m[k].qtd += r.qtde; m[k].valor += r.valor_total; total += r.valor_total
  }
  return Object.values(m).map(d => ({
    ...d, valor: Math.round(d.valor * 100) / 100,
    pct: total > 0 ? Math.round(d.valor / total * 10000) / 100 : 0
  })).sort((a, b) => b.valor - a.valor)
}
