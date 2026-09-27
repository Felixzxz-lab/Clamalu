// Recortes "mês fechado" e "acumulado do ano" usados nas telas de Produto e
// Cliente (escopo aprovado em 22/09/2026). Puro, sem React.
//
// Referência = o último mês que tem venda dentro do que os filtros deixaram.
//   mês ......... só as linhas desse mês
//   acumulado ... as linhas do mesmo ano, até esse mês
// Sem filtro nenhum isso dá "Ago/2026" e "Jan a Ago/2026". Com filtro de mês,
// o acumulado respeita o filtro (ex.: só Mar e Abr) e o rótulo diz isso.

const NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const nomeMes = (ano, mes) => `${NOMES[mes - 1]}/${ano}`

export function recortes(linhas) {
  let ref = null
  for (const r of linhas) {
    if (!ref || r.ano > ref.ano || (r.ano === ref.ano && r.mes > ref.mes)) ref = { ano: r.ano, mes: r.mes }
  }
  if (!ref) return { ref: null, mes: [], acum: [], rotuloMes: '—', rotuloAcum: '—' }

  const mes = linhas.filter(r => r.ano === ref.ano && r.mes === ref.mes)
  const acum = linhas.filter(r => r.ano === ref.ano && r.mes <= ref.mes)
  const primeiro = Math.min(...acum.map(r => r.mes))
  return {
    ref, mes, acum,
    rotuloMes: nomeMes(ref.ano, ref.mes),
    rotuloAcum: primeiro === ref.mes ? nomeMes(ref.ano, ref.mes) : `${NOMES[primeiro - 1]} a ${nomeMes(ref.ano, ref.mes)}`,
  }
}

// soma valor_total por uma chave, já com % sobre o total, do maior para o menor
export function somaPor(linhas, chave) {
  const m = {}; let total = 0
  for (const r of linhas) {
    const k = r[chave]
    if (!m[k]) m[k] = { chave: k, uf: r.uf, valor: 0, qtde: 0 }
    m[k].valor += r.valor_total; m[k].qtde += r.qtde; total += r.valor_total
  }
  return Object.values(m)
    .map(d => ({ ...d, pct: total > 0 ? d.valor / total * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor)
}

// clientes que formam `limite`% do faturamento: vai somando do maior para o
// menor e PARA no cliente que cruza o limite (ele entra — é quem fecha a faixa)
export function curva(ranking, limite) {
  const out = []; let acum = 0
  for (const c of ranking) {
    if (acum >= limite) break
    acum += c.pct
    out.push({ ...c, acumulado: acum })
  }
  return out
}
