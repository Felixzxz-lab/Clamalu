// Carga da planilha de mapeamento de mercado na tabela `mapeamento`.
//
//   node scripts/carregar-mapeamento.mjs "Planilhas/Mapeamento Clamalu - Culturas e Enzimas.xlsx"
//       -> só mostra o resumo (o que foi lido, por UF, e o que caiu em "Não informado")
//   node scripts/carregar-mapeamento.mjs "<arquivo>" --gravar
//       -> SUBSTITUI no banco as categorias presentes no arquivo
//
// Lê as chaves do .env.local. Rodar da raiz do repositório.
import fs from 'fs'
import { createRequire } from 'module'
import { ABAS, lerAba, clientesPorUf, tabelaUf, rotulo, sharePorUf } from '../lib/mapeamento.js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

const [arquivo, flag] = process.argv.slice(2)
if (!arquivo) { console.error('Uso: node scripts/carregar-mapeamento.mjs <arquivo.xlsx> [--gravar]'); process.exit(1) }
const gravar = flag === '--gravar'

const wb = XLSX.readFile(arquivo)
const lidas = {}
for (const [cat, aba] of Object.entries(ABAS)) {
  if (!wb.Sheets[aba]) { console.log(`(aba "${aba}" não está no arquivo — ${cat} fica como está no banco)`); continue }
  const { linhas, ignoradas } = lerAba(XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, defval: null }), cat)
  lidas[cat] = linhas

  const cli = clientesPorUf(linhas), sh = sharePorUf(linhas)
  console.log(`\n=== ${cat.toUpperCase()} — ${linhas.length} linhas, ${cli.GERAL.empresas} laticínios`)
  for (const uf of Object.keys(cli).filter(k => k !== 'GERAL').sort())
    console.log(`  ${uf}: ${cli[uf].linhas} linhas · ${cli[uf].empresas} laticínios · Clamalu em ${sh[uf].pctLinhas.toFixed(1)}% das linhas e ${sh[uf].pctLt.toFixed(1)}% do leite`)
  for (const [nome, fn] of [['distribuidor', rotulo.distribuidor], ['queijo', rotulo.queijo], [cat === 'cultura' ? 'apresentação' : 'marca', cat === 'cultura' ? rotulo.apresentacao : rotulo.marca]])
    console.log(`  ${nome}: ` + tabelaUf(linhas, fn).cats.map(c => `${c.cat} ${c.GERAL}`).join(' · '))
  if (ignoradas.length) console.log('  IGNORADAS (ajuste o dicionário em lib/mapeamento.js):', ignoradas)
}

if (!gravar) { console.log('\nNada gravado. Confira o resumo e rode de novo com --gravar.'); process.exit(0) }

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l.includes('='))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

for (const [cat, linhas] of Object.entries(lidas)) {
  const { error: eDel } = await db.from('mapeamento').delete().eq('categoria', cat)
  if (eDel) throw new Error(eDel.message)
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await db.from('mapeamento').insert(linhas.slice(i, i + 500))
    if (error) throw new Error(error.message)
  }
  const { count } = await db.from('mapeamento').select('id', { count: 'exact', head: true }).eq('categoria', cat)
  console.log(`${cat}: ${count} linhas no banco`)
}
