// Leitura da planilha "Mapeamento Clamalu - Culturas e Enzimas" (mercado de
// laticínios: quem usa qual cultura/coagulante, de quem compra, quanto leite
// processa). Puro, sem banco e sem React — usado pelo script de carga
// (scripts/carregar-mapeamento.mjs) e pela tela (components/Mapeamento.js).
//
// Unidade = LINHA = empresa × tipo de queijo (um laticínio pode ter várias).
// A sujeira conhecida da planilha está listada em docs/plano-mapeamento.md.

export const ABAS = { cultura: 'MAPEAMENTO CULTURA', enzima: 'MAPEAMENTO ENZIMA COAGULANTE' }

const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim()
const txt = v => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s === '' ? null : s }
const num = v => {
  if (v == null || v === '') return null
  if (typeof v === 'number') return isFinite(v) ? v : null
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
  return isFinite(n) ? n : null
}

// ---- dicionários (o que não bater aqui sai no resumo do script de carga) ----

// "Cultura Apresentação" que na verdade diz que o laticínio NÃO usa cultura
// comercial (faz soro fermento, vende leite spot…). O mesmo texto vem copiado
// em Distribuidor — nesses casos o distribuidor é descartado.
const SEM_CULTURA = ['soro fermento', 'leite spot', 'queijo coalho', 'leite pasteurizado', 'queijo minas frescal']

const TIPO_QUEIJO = { 'coalho': 'Queijo Coalho', 'minas frescal': 'Queijo Minas Frescal' }

const MARCA = { 'chy max m': 'Chy Max M', 'extra/xds': 'Chy Max Extra / XDS' }

const APRESENTACAO = { 'sa500 liofilizado': 'SA 500 LIOFILIZADO' }

// Empresa sem UF na planilha, com cidade conhecida
const UF_POR_EMPRESA = { 'laticinios vidalac eireli': 'GO', 'laticinio vidalac': 'GO' }

// tipos que não são queijo: ficam fora do rendimento (L de leite por kg de queijo)
export const SEM_RENDIMENTO = ['Leite Spot', 'Leite Pasteurizado', 'Bebida Láctea']

// distribuidor digitado todo em minúsculo ("servale") -> "Servale"
const capitalizar = s => s && s === s.toLowerCase() ? s.charAt(0).toUpperCase() + s.slice(1) : s

// ---- leitura ----

// acha a coluna pelo começo do nome, tolerando acento, espaço e quebra de linha
function colunas(cabecalho) {
  const h = cabecalho.map(norm)
  const achar = (...inicios) => h.findIndex(c => inicios.some(i => c.startsWith(i)))
  return {
    grupo: achar('company group'), empresa: achar('empresa'), cidade: achar('cidade'),
    uf: achar('estado', 'uf'), queijo: achar('tipo de queijo'),
    leite: achar('volume de leite'), kg: achar('volume de queijo'),
    apresentacao: achar('cultura apresentacao', 'coagulante apresentacao'),
    agente: achar('coagulante agente'), embalagem: achar('embalagem'), unidade: achar('unidade de medida'),
    fornecedor: achar('forncedor', 'fornecedor'), marca: achar('marca'), forca: achar('forca'),
    dosagem: achar('aplicacao', 'dosagem'), distribuidor: achar('distribuidor'),
  }
}

// `linhas` = sheet_to_json(ws, { header: 1, defval: null }) — primeira linha é o cabeçalho
export function lerAba(linhas, categoria) {
  const c = colunas(linhas[0] || [])
  const g = (r, k) => c[k] >= 0 ? r[c[k]] : null
  const saida = [], ignoradas = []

  linhas.slice(1).forEach((r, i) => {
    const grupo = txt(g(r, 'grupo')), empresaTxt = txt(g(r, 'empresa'))
    const empresa = empresaTxt || grupo
    // 260 linhas só com "U" em Unidade e a linha de total solta no fim: sem empresa, não é dado
    if (!empresa) return
    const uf = txt(g(r, 'uf'))?.toUpperCase() || UF_POR_EMPRESA[norm(empresa)] || UF_POR_EMPRESA[norm(grupo)] || null
    if (!uf) { ignoradas.push({ linha: i + 2, empresa, motivo: 'sem UF' }); return }

    const queijoTxt = txt(g(r, 'queijo'))
    const apres = txt(g(r, 'apresentacao'))
    const distTxt = txt(g(r, 'distribuidor'))
    // às vezes o 'não usa cultura' está só no Distribuidor (ex.: Queijo Coalho)
    const semComercial = categoria === 'cultura' && (SEM_CULTURA.includes(norm(apres)) || SEM_CULTURA.includes(norm(distTxt)))
    const marcaTxt = txt(g(r, 'marca'))

    saida.push({
      categoria,
      linha_planilha: i + 2,
      company_group: grupo,
      empresa,
      cidade: txt(g(r, 'cidade')),
      uf,
      tipo_queijo: queijoTxt ? (TIPO_QUEIJO[norm(queijoTxt)] || queijoTxt) : null,
      leite_litros_ano: num(g(r, 'leite')),
      queijo_kg_ano: num(g(r, 'kg')),
      apresentacao: semComercial || !apres ? null : (APRESENTACAO[norm(apres)] || apres),
      agente: txt(g(r, 'agente')),
      embalagem: num(g(r, 'embalagem')),
      unidade: txt(g(r, 'unidade')),
      fornecedor: txt(g(r, 'fornecedor')),
      marca: marcaTxt ? (MARCA[norm(marcaTxt)] || marcaTxt) : null,
      forca_imcu: num(g(r, 'forca')),
      dosagem: num(g(r, 'dosagem')),
      distribuidor: semComercial ? null : capitalizar(distTxt),
      sem_produto_comercial: semComercial,
    })
  })
  return { linhas: saida, ignoradas }
}

// ---- rótulos usados nas tabelas (nunca deixam categoria em branco) ----

export const rotulo = {
  distribuidor: l => l.sem_produto_comercial ? 'Sem cultura comercial' : (l.distribuidor || 'Não informado'),
  marca: l => l.sem_produto_comercial ? 'Sem cultura comercial' : (l.marca || 'Não informado'),
  apresentacao: l => l.sem_produto_comercial ? 'Sem cultura comercial' : (l.apresentacao || 'Não informado'),
  queijo: l => l.tipo_queijo || 'Não informado',
}
export const ehClamalu = l => norm(l.distribuidor) === 'clamalu'

// ---- agregações (tela e script usam as mesmas) ----

export const ufsDe = linhas => [...new Set(linhas.map(l => l.uf))].sort()

// contagem de linhas por categoria × UF, com o "GERAL"
// -> { cats: [{ cat, GERAL, GO, MT… }] ordenado pelo geral, totais: { GERAL, GO… } }
export function tabelaUf(linhas, fn) {
  const m = {}, totais = { GERAL: 0 }
  for (const l of linhas) {
    const k = fn(l)
    const o = m[k] = m[k] || { cat: k, GERAL: 0 }
    o[l.uf] = (o[l.uf] || 0) + 1; o.GERAL++
    totais[l.uf] = (totais[l.uf] || 0) + 1; totais.GERAL++
  }
  return { cats: Object.values(m).sort((a, b) => b.GERAL - a.GERAL), totais }
}

// laticínios (empresas distintas) e linhas por UF
export function clientesPorUf(linhas) {
  const out = { GERAL: { empresas: new Set(), linhas: 0 } }
  for (const l of linhas) {
    for (const k of [l.uf, 'GERAL']) {
      const o = out[k] = out[k] || { empresas: new Set(), linhas: 0 }
      o.empresas.add(norm(l.empresa)); o.linhas++
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, o]) => [k, { empresas: o.empresas.size, linhas: o.linhas }]))
}

// Volume de leite e de queijo por UF. Cada empresa × tipo de queijo conta UMA
// vez: a mesma linha às vezes vem repetida com duas culturas (ex.: Laticínios
// JL, Mussarela com CP 500 e com STI) e somaria o leite em dobro.
export function volumePorUf(linhas) {
  const unico = {}
  for (const l of linhas) {
    const k = [norm(l.empresa), l.uf, l.tipo_queijo].join('|')
    const o = unico[k] = unico[k] || { uf: l.uf, leite: 0, kg: 0 }
    o.leite = Math.max(o.leite, l.leite_litros_ano || 0)
    o.kg = Math.max(o.kg, l.queijo_kg_ano || 0)
  }
  const out = { GERAL: { leite: 0, kg: 0 } }
  for (const o of Object.values(unico)) {
    for (const k of [o.uf, 'GERAL']) { const t = out[k] = out[k] || { leite: 0, kg: 0 }; t.leite += o.leite; t.kg += o.kg }
  }
  return out
}

// Rendimento = litros de leite ÷ kg de queijo, agrupado por `fn`. Só entram
// linhas com os dois volumes e que são queijo de fato.
export function rendimento(linhas, fn) {
  const m = {}
  for (const l of linhas) {
    if (!(l.leite_litros_ano > 0 && l.queijo_kg_ano > 0) || SEM_RENDIMENTO.includes(l.tipo_queijo)) continue
    const k = fn(l)
    const o = m[k] = m[k] || { cat: k, n: 0, leite: 0, kg: 0 }
    o.n++; o.leite += l.leite_litros_ano; o.kg += l.queijo_kg_ano
  }
  return Object.values(m).map(o => ({ ...o, rend: o.leite / o.kg })).sort((a, b) => b.leite - a.leite)
}

// Fatia da Clamalu: % das linhas e % do leite (mesma regra de volumePorUf)
export function sharePorUf(linhas) {
  const out = {}
  const vTodos = volumePorUf(linhas), vCla = volumePorUf(linhas.filter(ehClamalu))
  const cTodos = clientesPorUf(linhas), cCla = clientesPorUf(linhas.filter(ehClamalu))
  for (const k of Object.keys(cTodos)) {
    const lt = vTodos[k]?.leite || 0, ltCla = vCla[k]?.leite || 0
    out[k] = { linhas: cTodos[k].linhas, linhasCla: cCla[k]?.linhas || 0, lt, ltCla,
      pctLinhas: cTodos[k].linhas ? (cCla[k]?.linhas || 0) / cTodos[k].linhas * 100 : 0,
      pctLt: lt ? ltCla / lt * 100 : 0 }
  }
  return out
}
