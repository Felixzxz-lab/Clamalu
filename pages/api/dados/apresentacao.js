import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth, aplicarFiltroVendedor } from '../../../lib/auth'
import { selectAll } from '../../../lib/db'
import { montarApresentacao, mesesDisponiveis } from '../../../lib/apresentacao'
import { sharePorUf, clientesPorUf, tabelaUf, rotulo } from '../../../lib/mapeamento'

// Dados da apresentação semanal. ?ano=&mes= escolhe o mês de referência;
// sem eles, usa o último mês com venda. Lê só os 2 anos necessários (o de
// referência e o anterior) — o seletor oferece os meses desses dois anos.
// Respeita os vendedores ocultos do usuário, como as telas.
const PAGINAS_VENDAS = ['vendedor', 'produto', 'cliente', 'comparacao']

export default requireAuth(async function handler(req, res) {
  if (!PAGINAS_VENDAS.some(p => req.user.paginas?.includes(p))) return res.status(403).json({ error: 'Sem acesso' })
  const db = supabaseAdmin()
  try {
    let anoRef = Number(req.query.ano)
    if (!anoRef) {
      const { data, error } = await aplicarFiltroVendedor(db.from('vendas').select('ano'), req.user, []).order('ano', { ascending: false }).limit(1)
      if (error) throw new Error(error.message)
      if (!data.length) return res.status(200).json({ meses: [], dados: null })
      anoRef = data[0].ano
    }

    const [linhas, mercadoBruto] = await Promise.all([
      selectAll(() => aplicarFiltroVendedor(
        db.from('vendas').select('ano,mes,cliente,uf,produto,vendedor,qtde,valor_total').in('ano', [anoRef - 1, anoRef]),
        req.user, [])),
      Promise.all([['cultura', 'culturas'], ['enzima', 'enzimas']].map(([categoria, pagina]) =>
        req.user.paginas?.includes(pagina)
          ? selectAll(() => db.from('mapeamento').select('empresa,uf,tipo_queijo,leite_litros_ano,queijo_kg_ano,apresentacao,marca,distribuidor,sem_produto_comercial').eq('categoria', categoria))
          : [])),
    ])

    const meses = mesesDisponiveis(linhas)
    if (!meses.length) return res.status(200).json({ meses: [], dados: null })
    const ref = meses.find(m => m.ano === anoRef && m.mes === Number(req.query.mes)) || meses.find(m => m.ano === anoRef) || meses[0]
    const dados = montarApresentacao(linhas, ref)

    // mercado mapeado: só para quem tem a página correspondente
    dados.mercado = []
    for (const [i, [categoria, nome]] of [['cultura', 'Culturas'], ['enzima', 'Enzimas e Coagulantes']].entries()) {
      const m = mercadoBruto[i]
      if (!m.length) continue
      const l = m.map(r => ({ ...r, leite_litros_ano: Number(r.leite_litros_ano) || 0, queijo_kg_ano: Number(r.queijo_kg_ano) || 0 }))
      // top 6 de cada ranking, contando produções (laticínio × tipo de queijo)
      const top = fn => tabelaUf(l, fn).cats.slice(0, 6).map(c => ({ cat: c.cat, n: c.GERAL }))
      dados.mercado.push({
        categoria, nome, curto: nome.split(' ')[0], insumo: categoria === 'cultura' ? 'cultura' : 'coagulante', share: sharePorUf(l), cli: clientesPorUf(l),
        distribuidores: top(rotulo.distribuidor),
        usados: top(categoria === 'enzima' ? rotulo.marca : rotulo.apresentacao),
      })
    }

    return res.status(200).json({ meses, dados })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})
