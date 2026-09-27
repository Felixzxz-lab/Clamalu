// Números da apresentação semanal (botão "▶ Apresentação"). Puro, sem banco:
// recebe as linhas de vendas do ano de referência e do anterior e devolve um
// objeto por slide. A API (pages/api/dados/apresentacao.js) só busca e repassa.
//
// Toda comparação é "mesmo período do ano anterior": o mês de referência
// contra o mesmo mês, e jan..mês contra jan..mês — nunca ano parcial contra
// ano cheio.
import { segmentoDe, SEGMENTOS } from './segmentos'
import { nomeMes, somaPor, curva } from './periodo'

const soma = l => l.reduce((s, r) => s + r.valor_total, 0)
const vari = (atual, ant) => ant > 0 ? (atual - ant) / ant * 100 : null
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// meses com venda, do mais recente para o mais antigo: [{ ano, mes, rotulo }]
export function mesesDisponiveis(linhas) {
  const s = new Set(linhas.map(r => r.ano * 100 + r.mes))
  return [...s].sort((a, b) => b - a).map(k => ({ ano: Math.floor(k / 100), mes: k % 100, rotulo: nomeMes(Math.floor(k / 100), k % 100) }))
}

// diferença por cliente entre dois recortes, com o produto e o mês que mais explicam
function movimentos(atual, ant) {
  const m = {}
  const add = (r, s) => {
    const o = m[r.cliente] = m[r.cliente] || { cliente: r.cliente, uf: r.uf, v0: 0, v1: 0, prod: {}, mes: {} }
    if (s > 0) o.v1 += r.valor_total; else o.v0 += r.valor_total
    o.prod[r.produto] = (o.prod[r.produto] || 0) + s * r.valor_total
    o.mes[r.mes] = (o.mes[r.mes] || 0) + s * r.valor_total
  }
  atual.forEach(r => add(r, 1)); ant.forEach(r => add(r, -1))
  const maior = (obj, sg) => Object.entries(obj).reduce((b, [k, v]) => (b === null || v * sg > b[1] * sg) ? [k, v] : b, null)
  return Object.values(m).map(o => {
    const diff = o.v1 - o.v0, sg = diff >= 0 ? 1 : -1
    const [produto, produtoDiff] = maior(o.prod, sg), [mes, mesDiff] = maior(o.mes, sg)
    return { cliente: o.cliente, uf: o.uf, v0: o.v0, v1: o.v1, diff, pct: vari(o.v1, o.v0), produto, produtoDiff, mes: MESES[mes - 1], mesDiff }
  })
}

export function montarApresentacao(linhas, ref) {
  const { ano, mes } = ref
  const L = linhas.map(r => ({ ...r, segmento: segmentoDe(r.produto) }))
  const doMes = L.filter(r => r.ano === ano && r.mes === mes)
  const doMesAnt = L.filter(r => r.ano === ano - 1 && r.mes === mes)
  const acum = L.filter(r => r.ano === ano && r.mes <= mes)
  const acumAnt = L.filter(r => r.ano === ano - 1 && r.mes <= mes)
  const mesPrev = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
  const doMesPrev = L.filter(r => r.ano === mesPrev.ano && r.mes === mesPrev.mes)

  const periodo = {
    ano, mes, rotuloMes: nomeMes(ano, mes), rotuloMesAnt: nomeMes(ano - 1, mes), rotuloMesPrev: nomeMes(mesPrev.ano, mesPrev.mes),
    rotuloAcum: mes === 1 ? nomeMes(ano, 1) : `Jan a ${nomeMes(ano, mes)}`,
    rotuloAcumAnt: mes === 1 ? nomeMes(ano - 1, 1) : `Jan a ${nomeMes(ano - 1, mes)}`,
  }

  // ---- resumo ----
  const fat = { mes: soma(doMes), mesAnt: soma(doMesAnt), mesPrev: soma(doMesPrev), acum: soma(acum), acumAnt: soma(acumAnt) }
  const resumo = {
    ...fat,
    varMes: vari(fat.mes, fat.mesAnt), varMesPrev: vari(fat.mes, fat.mesPrev), varAcum: vari(fat.acum, fat.acumAnt),
    clientesMes: new Set(doMes.map(r => r.cliente)).size, clientesAcum: new Set(acum.map(r => r.cliente)).size,
    clientesAcumAnt: new Set(acumAnt.map(r => r.cliente)).size,
    produtosAcum: new Set(acum.map(r => r.produto)).size,
  }

  // ---- evolução mês a mês (ano anterior inteiro, ano atual até a referência) ----
  const evolucao = MESES.map((rot, i) => ({
    mes: rot,
    atual: i + 1 <= mes ? soma(L.filter(r => r.ano === ano && r.mes === i + 1)) : null,
    anterior: soma(L.filter(r => r.ano === ano - 1 && r.mes === i + 1)),
  }))

  // ---- vendedores ----
  const vendedores = somaPor(acum, 'vendedor').map(v => {
    const ant = soma(acumAnt.filter(r => r.vendedor === v.chave))
    const seg = Object.fromEntries(SEGMENTOS.map(s => [s, soma(acum.filter(r => r.vendedor === v.chave && r.segmento === s))]))
    return { vendedor: v.chave, acum: v.valor, pct: v.pct, mes: soma(doMes.filter(r => r.vendedor === v.chave)), acumAnt: ant, var: vari(v.valor, ant), ...seg }
  })

  // ---- segmentos ----
  const segmentos = SEGMENTOS.map(s => {
    const a = soma(acum.filter(r => r.segmento === s)), b = soma(acumAnt.filter(r => r.segmento === s))
    return { segmento: s, acum: a, acumAnt: b, var: vari(a, b), pct: fat.acum > 0 ? a / fat.acum * 100 : 0, mes: soma(doMes.filter(r => r.segmento === s)) }
  })

  // ---- produtos que mais cresceram / caíram (acumulado x mesmo período) ----
  const pm = {}
  acum.forEach(r => { const o = pm[r.produto] = pm[r.produto] || { produto: r.produto, segmento: r.segmento, v0: 0, v1: 0 }; o.v1 += r.valor_total })
  acumAnt.forEach(r => { const o = pm[r.produto] = pm[r.produto] || { produto: r.produto, segmento: r.segmento, v0: 0, v1: 0 }; o.v0 += r.valor_total })
  const prods = Object.values(pm).map(p => ({ ...p, diff: p.v1 - p.v0, var: vari(p.v1, p.v0) }))
  const produtos = {
    cresceram: prods.filter(p => p.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5),
    cairam: prods.filter(p => p.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5),
  }

  // ---- concentração: quantos clientes fazem 20/50/70% e o top 10 com posição anterior ----
  const rkAcum = somaPor(acum, 'cliente'), rkAnt = somaPor(acumAnt, 'cliente')
  const posAnt = Object.fromEntries(rkAnt.map((c, i) => [c.chave, i + 1]))
  const concentracao = {
    total: rkAcum.length,
    faixas: [20, 50, 70].map(f => ({ faixa: f, clientes: curva(rkAcum, f).length })),
    top: rkAcum.slice(0, 10).map((c, i) => ({ cliente: c.chave, uf: c.uf, valor: c.valor, pct: c.pct, pos: i + 1, posAnt: posAnt[c.chave] || null })),
  }

  // ---- clientes que mais cresceram / caíram, com o motivo ----
  const movs = movimentos(acum, acumAnt)
  const clientes = {
    cresceram: movs.filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5),
    cairam: movs.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5),
  }

  // ---- estados ----
  const ufs = { mes: somaPor(doMes, 'uf').map(u => ({ uf: u.chave, valor: u.valor, pct: u.pct })), acum: somaPor(acum, 'uf').map(u => ({ uf: u.chave, valor: u.valor, pct: u.pct })) }

  // ---- radar: cliente × produto que comprava no ano anterior e zerou neste ----
  const par = {}
  acumAnt.forEach(r => { const k = r.cliente + '||' + r.produto; const o = par[k] = par[k] || { cliente: r.cliente, uf: r.uf, produto: r.produto, v0: 0, v1: 0 }; o.v0 += r.valor_total })
  acum.forEach(r => { const k = r.cliente + '||' + r.produto; if (par[k]) par[k].v1 += r.valor_total })
  const zerados = Object.values(par).filter(o => o.v0 > 0 && o.v1 === 0).sort((a, b) => b.v0 - a.v0)
  const radar = { total: zerados.reduce((s, z) => s + z.v0, 0), pares: zerados.length, clientes: new Set(zerados.map(z => z.cliente)).size, top: zerados.slice(0, 6) }

  return { periodo, resumo, evolucao, vendedores, segmentos, produtos, concentracao, clientes, ufs, radar }
}
