// Cor por vendedor. A cor segue o VENDEDOR, nunca a posição dele no ranking —
// filtrar ou reordenar não pode repintar quem sobrou.
//
// A paleta anterior (#1341c4/#16a34a/#dc2626/#ea8c00) reprovava no teste de
// daltonismo: CLEBER vermelho x WENDEL verde davam ΔE 5,0 em deuteranopia e
// CLAMALU laranja x WENDEL verde, 3,5 em protanopia — indistinguíveis para
// ~8% dos homens. Trocada por Okabe-Ito, desenhada para visão daltônica.
//
// Cada vendedor ficou na MESMA família de cor de antes (azul segue azul, verde
// segue verde...), então ninguém precisa reaprender quem é quem. YGOR manteve
// exatamente o roxo que já estava no ar.
//
// Validado com o validador de paleta, modo claro, todos os pares:
//   lightness PASS · chroma PASS · pior par normal ΔE 15,6 PASS
//   pior par CVD ΔE 7,6 (faixa 6–8, legal com rótulo direto — que existe:
//   nome do vendedor em cada barra, legenda no gráfico de linha e tabela)
const FIXAS = {
  THIAGO:  '#0072B2', // azul
  WENDEL:  '#009E73', // verde
  CLEBER:  '#D55E00', // vermelho
  CLAMALU: '#E69F00', // laranja
  YGOR:    '#7c3aed', // roxo (inalterado)
  MAICON:  '#CC79A7', // rosa
}

// Vaga para vendedor futuro. Só uma: acima de 7 séries a separação por cor
// deixa de ser confiável — o certo aí é agrupar em "Outros" ou facetar, não
// inventar mais matiz. Atribuída por ordem alfabética (estável entre sessões),
// nunca por valor vendido.
const RESERVA = ['#56B4E9']

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
