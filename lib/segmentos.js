// Segmento do produto, pela regra do cliente (Romulo, 21/09/2026):
//   FERM. ...                                  -> Culturas
//   CHYMAX EXTRA, CHYMAX M, CHYMAX SUPREME e YIELDMAX -> Enzimas
//   o resto                                    -> Outros
// O nome vem da planilha de vendas, então a comparação ignora caixa e espaços.

export const SEGMENTOS = ['Culturas', 'Enzimas', 'Outros']

// produto que é cultura mas veio digitado sem o "FERM." na frente
const CULTURAS_SEM_PREFIXO = ['GRANA 105']

const ENZIMAS = ['CHYMAX EXTRA', 'CHYMAX M', 'CHYMAX SUPREME', 'YIELDMAX']

export function segmentoDe(produto) {
  const p = String(produto || '').toUpperCase().replace(/\s+/g, ' ').trim()
  if (p.startsWith('FERM.') || CULTURAS_SEM_PREFIXO.includes(p)) return 'Culturas'
  // YIELDMAX vem com a embalagem no nome ("YIELDMAX / 5L")
  if (ENZIMAS.some(e => p === e || p.startsWith(e + ' '))) return 'Enzimas'
  return 'Outros'
}
