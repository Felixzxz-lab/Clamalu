// Cor por vendedor. A cor segue o VENDEDOR, nunca a posição dele no ranking —
// filtrar ou reordenar não pode repintar quem sobrou.
//
// Os quatro primeiros são os que já estavam no ar; não mexer neles sem avisar,
// o cliente reconhece cada um pela cor. YGOR e MAICON usam as matizes que o
// app já usa para UF em produto.js (roxo/ciano), escolhidas por serem as que
// não criam par indistinguível com as quatro existentes.
const FIXAS = {
  THIAGO:  '#1341c4', // azul
  WENDEL:  '#16a34a', // verde
  CLEBER:  '#dc2626', // vermelho
  CLAMALU: '#ea8c00', // laranja
  YGOR:    '#7c3aed', // roxo
  MAICON:  '#0891b2', // ciano
}

// Vagas para vendedores futuros, em ordem fixa. Atribuídas por ordem alfabética
// do nome (estável entre sessões), nunca por valor vendido.
const RESERVA = ['#be185d', '#4d7c0f', '#7c2d12', '#0f766e']

const CINZA = '#6b7a99' // acabaram as vagas: cinza neutro, nunca cor gerada

// `todos` = lista completa de vendedores conhecidos, para a atribuição das
// vagas de reserva ser a mesma em qualquer tela.
export function corVendedor(nome, todos = []) {
  if (FIXAS[nome]) return FIXAS[nome]
  const extras = [...new Set(todos)].filter(v => v && !FIXAS[v]).sort()
  const i = extras.indexOf(nome)
  return i >= 0 && i < RESERVA.length ? RESERVA[i] : CINZA
}

// ---- Cor por ANO (gráfico de comparação) ----
// Mesma ideia: os anos que já estavam no ar mantêm a cor; ano novo pega a
// próxima vaga fixa em ordem cronológica, nunca uma cor gerada.
const ANOS_FIXOS = { 2024: '#93aafc', 2025: '#1341c4', 2026: '#16a34a' }
const ANOS_RESERVA = ['#ea8c00', '#7c3aed', '#0891b2', '#dc2626']

export function corAno(ano, todos = []) {
  const a = Number(ano)
  if (ANOS_FIXOS[a]) return ANOS_FIXOS[a]
  const extras = [...new Set(todos.map(Number))].filter(x => x && !ANOS_FIXOS[x]).sort((x, y) => x - y)
  const i = extras.indexOf(a)
  return i >= 0 && i < ANOS_RESERVA.length ? ANOS_RESERVA[i] : CINZA
}
