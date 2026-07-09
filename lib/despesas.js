// Parsing da planilha de DESPESAS — formato matriz (fornecedor x mês).
// Compartilhado entre a prévia e a importação.
//
// Layout esperado da aba:
//   linha título   -> "RESUMO DESPESAS ..."
//   linha cabeçalho-> DESPESA | (tipo) | JAN | FEV | ... | DEZ | TOTAL
//   linhas dados   -> <fornecedor> | <categoria> | valores dos meses | total
//   linha final    -> "DESPESAS DA CLAMALU" (total geral — IGNORADA)
//
// A importação soma as CÉLULAS DOS MESES (não confia na coluna TOTAL, que na
// planilha de origem já veio com pelo menos uma linha sem a fórmula preenchida).

import { parseNum } from './planilha.js'

const MESES_SIGLA = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

// Remove acentos e "mojibake" (ç, ã lidos como �) e normaliza para classificar.
function slug(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim().toLowerCase()
}

// Classificador por palavra-chave (tolerante ao texto solto da coluna de tipo).
// Retorna um "grupo" limpo para os gráficos. Ajuste os grupos conforme a Clamalu.
const REGRAS = [
  [/imposto|encargo|icms|pis|cofins|irpj|csll|irrf|fgts|gps|inss|tribut/, 'Impostos e Encargos'],
  [/salario|funcionario|folha|ferias|adto|negoc|vale transporte|convenio|seguro de vida|sura|benefic/, 'Folha e Benefícios'],
  [/frete|entrega|postagem|correio|motoboy|transport/, 'Fretes e Logística'],
  [/revenda|mercadoria|gelo seco|insumo/, 'Revenda / Mercadoria'],
  [/loca[cç]|automovel|movida|carro/, 'Locação de Veículos'],
  [/passagem|aerea|hospedagem|hotel|viagem|cartao|vgm/, 'Viagens'],
  [/marketing|anuncio|revista|brinde|e book|ebook|casbran|adesivo|etiqueta/, 'Marketing'],
  [/telefone|vivo|claro|internet|pabx/, 'Telefonia e Internet'],
  [/energia|consumo|agua|saneago|equatorial|iptu|imoveis/, 'Utilidades e Imóveis'],
  [/manut|conserto|reforma|camara fria|freezer|extintor|dedetiz|seguranca|chave|cadeado|poda|torneira/, 'Manutenção'],
  [/dashboard|software|site|hosp de site|impressora|kalunga|licenca software|\bti\b|inforsystem|no break|toner|recarga/, 'TI e Software'],
  [/contab|conselho|honorario|had hanter|certif|renovacao|licenc|taxa|prefeitura|sindic|cert digital/, 'Serviços e Licenças'],
  [/tarifa|banco|remessa|cobranca/, 'Tarifas Bancárias'],
  [/escritorio|papelaria|material/, 'Materiais e Escritório'],
]

export function classificarGrupo(despesa, categoria) {
  const alvo = slug(categoria) + ' ' + slug(despesa)
  for (const [re, grupo] of REGRAS) if (re.test(alvo)) return grupo
  return 'Outros'
}

function txt(v) {
  return v == null || String(v).trim() === '' ? null : String(v).trim()
}

// Encontra a linha de cabeçalho (a que contém "DESPESA" na 1ª coluna) e mapeia
// quais colunas são JAN..DEZ. Recebe a aba como matriz (array de arrays).
function acharCabecalho(matriz) {
  for (let i = 0; i < Math.min(matriz.length, 8); i++) {
    const linha = matriz[i] || []
    const c0 = slug(linha[0])
    if (c0 === 'despesa' || c0.startsWith('despesa')) {
      const colMes = {}
      linha.forEach((cel, idx) => {
        const s = slug(cel).toUpperCase()
        const m = MESES_SIGLA.indexOf(s)
        if (m >= 0) colMes[m + 1] = idx
      })
      return { headerRow: i, colMes }
    }
  }
  return null
}

// Converte a aba (matriz) em registros longos: 1 por (fornecedor, mês) com valor.
// `ano` vem do nome da aba ("CLAMALU 2026") ou é informado pelo admin.
export function parseDespesasMatriz(matriz, ano) {
  const cab = acharCabecalho(matriz)
  if (!cab) return { registros: [], erro: 'Cabeçalho (linha "DESPESA ... JAN ... DEZ") não encontrado' }
  const { headerRow, colMes } = cab
  const meses = Object.keys(colMes).map(Number)
  if (!meses.length) return { registros: [], erro: 'Nenhuma coluna de mês (JAN..DEZ) encontrada' }

  const registros = []
  for (let i = headerRow + 1; i < matriz.length; i++) {
    const linha = matriz[i] || []
    const nome = txt(linha[0])
    if (!nome) continue
    const nl = slug(nome)
    if (nl.startsWith('despesas da clamalu')) continue      // total geral
    if (nl.startsWith('india')) continue // rodapé (data solta "índia dd/mm/aa")
    const categoria = txt(linha[1])
    const grupo = classificarGrupo(nome, categoria)
    for (const m of meses) {
      const valor = parseNum(linha[colMes[m]])
      if (!valor) continue // ignora vazio/zero
      registros.push({ despesa: nome, categoria, grupo, ano, mes: m, valor: Math.round(valor * 100) / 100 })
    }
  }
  return { registros, erro: null }
}

// Extrai o ano do nome da aba (ex.: "CLAMALU 2026" -> 2026). Fallback: ano atual.
export function anoDaAba(nomeAba) {
  const m = String(nomeAba || '').match(/(20\d{2})/)
  return m ? parseInt(m[1]) : new Date().getFullYear()
}
