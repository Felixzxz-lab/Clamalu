// Preços em euro que o cliente de fato pagou, sem média (pedido de 08/10/2026:
// "o preço é o fixo da planilha"). Puro, sem React.
//
// - O PREÇO EM EURO da planilha é VALOR UNIT. ÷ COTAÇÃO, e o R$ faturado é
//   arredondado, então o mesmo preço fixo volta como 129,20 / 129,31 / 129,21.
//   Compras seguidas com até 0,5% de diferença contam como o mesmo preço; a
//   faixa guarda o menor e o maior para o tooltip.
// - Uma faixa = um período em que o cliente pagou o mesmo preço. Duas faixas no
//   ano = reajuste (ou erro na planilha: ver linhaSuspeita abaixo).

const TOL = 0.005
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// compras de UM produto, de qualquer ordem -> [{ preco, min, max, mesIni, mesFim, qtde, compras, suspeita }]
// As compras com € suspeito vêm por último, uma por uma, e não quebram a faixa
// do preço certo (senão jun 129,20 / jul ⚠ / ago 129,31 viravam dois preços).
export function faixasPreco(compras, cotMediana = {}) {
  const ord = compras.filter(c => c.preco_euro > 0).sort((a, b) => (a.data || '').localeCompare(b.data || ''))
  const out = [], susp = []
  for (const c of ord) {
    const p = Math.round(c.preco_euro * 100) / 100
    const f = { preco: p, min: p, max: p, mesIni: c.mes, mesFim: c.mes, qtde: c.qtde, compras: 1, suspeita: false }
    if (linhaSuspeita(c, cotMediana)) { susp.push({ ...f, suspeita: true }); continue }
    const ult = out[out.length - 1]
    if (ult && Math.abs(ult.preco - p) / ult.preco <= TOL) {
      ult.mesFim = c.mes; ult.qtde += c.qtde; ult.compras++
      ult.min = Math.min(ult.min, p); ult.max = Math.max(ult.max, p)
    } else out.push(f)
  }
  return [...out, ...susp]
}

// € provavelmente errado na planilha. Dois casos vistos na base em out/2026:
// - cotação mais de 6% longe da mediana do mês (12/03 com 5,1596, 20/07 com
//   5,1176, 25/08 com 5,057);
// - PREÇO EM EURO que não bate com R$ ÷ cotação (Bom Sabor, NF 33864: € 6,13
//   onde 712,75 ÷ 6,3232 dá 112,72).
export function linhaSuspeita(c, cotMediana) {
  if (!(c.cotacao_euro > 0)) return false
  if (c.preco_euro > 0 && c.valor_unit > 0 && Math.abs(c.valor_unit / c.cotacao_euro - c.preco_euro) / c.preco_euro > 0.01) return true
  const med = cotMediana[c.ano + '-' + c.mes]
  return !!(med && Math.abs(c.cotacao_euro - med) / med > 0.06)
}

export const rotuloMeses = f => f.mesIni === f.mesFim ? MESES[f.mesIni - 1] : `${MESES[f.mesIni - 1]}–${MESES[f.mesFim - 1]}`

export function mediana(v) {
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null
}
