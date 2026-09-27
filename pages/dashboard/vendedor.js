import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { MultiSelect, MESES_OPC, useOpcoes } from '../../components/MultiSelect'
import { corVendedor, COR_SEGMENTO } from '../../lib/cores'
import { SEGMENTOS } from '../../lib/segmentos'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

function fmtVal(v) { if (!v) return '—'; if (v >= 1e6) return 'R$ ' + (v/1e6).toFixed(2).replace('.',',') + ' Mi'; if (v >= 1e3) return 'R$ ' + (v/1e3).toFixed(0) + ' Mil'; return 'R$ ' + Math.round(v) }
function fmtN(v) { return Number(Math.round(v||0)).toLocaleString('pt-BR') }
// cor "esmaecida" (mesma cor com baixa opacidade) para a parte não realçada
function fade(hex, a = '2e') { return (hex && hex.length === 7 ? hex : '#888888') + a }

export default function Vendedor({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState([])
  const [fMes, setFMes] = useState([])
  const [fVend, setFVend] = useState([])
  const [sel, setSel] = useState(null) // realce: { dim, value }
  const opcoes = useOpcoes()

  useEffect(() => { carregar() }, [fAno, fMes, fVend])

  async function carregar() {
    setLoading(true)
    const p = new URLSearchParams()
    if (fAno.length) p.set('ano', fAno.join(','))
    if (fMes.length) p.set('mes', fMes.join(','))
    if (fVend.length) p.set('vendedor', fVend.join(','))
    const r = await fetch('/api/dados/vendedor?' + p)
    if (r.status === 401) { router.push('/'); return }
    const d = await r.json()
    setDados(d)
    setSel(null)
    setLoading(false)
  }

  // clicar num elemento: realça (ou tira o realce se clicar no mesmo)
  function pick(dim, value) {
    if (!value) return
    setSel(s => (s && s.dim === dim && s.value === value) ? null : { dim, value })
  }

  const linhas = dados?.linhas || []
  // cor por vendedor sai dos dados, para vendedor novo nao cair no cinza
  const todosVends = (dados?.porVendedor || []).map(v => v.vendedor)
  // soma de uma medida por categoria, restrita ao item realçado (se houver)
  function aggBy(catKey, measure, comSel) {
    const m = {}
    for (const r of linhas) {
      if (comSel && sel && r[sel.dim] !== sel.value) continue
      const k = r[catKey]
      m[k] = (m[k] || 0) + (measure === 'qtde' ? r.qtde : r.valor_total)
    }
    return m
  }
  // categoria "contribui" para o item realçado? (tem alguma linha em comum)
  function contribui(catKey, value) {
    if (!sel) return true
    return linhas.some(r => r[catKey] === value && r[sel.dim] === sel.value)
  }
  const isSel = (dim, value) => sel && sel.dim === dim && sel.value === value

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    if (dados?.porVendedor) {
      const s1 = [['Vendedor','Valor Total','% Total','QTDE','Clientes'], ...dados.porVendedor.map(d => [d.vendedor, d.valor, d.pct, d.qtde, d.clientes])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Vendedores')
    }
    if (dados?.tabelaClientes) {
      const s2 = [['Cliente','UF','QTDE','% Valor','Valor Total'], ...dados.tabelaClientes.map(d => [d.cliente, d.uf, d.qtd, d.pct, d.valor])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Clientes')
    }
    if (dados?.tabelaProdutos) {
      const s3 = [['Produto','% Valor','QTDE','Valor Total'], ...dados.tabelaProdutos.map(d => [d.produto, d.pct, d.qtde, d.valor])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Produtos')
    }
    const s4 = [['Segmento','Produto','Valor Total','% do Segmento','QTDE']]
    porSegmento.forEach(g => g.produtos.forEach(p => s4.push([g.segmento, p.produto, Math.round(p.valor * 100) / 100, Math.round(p.pct * 100) / 100, p.qtde])))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4), 'Segmentos')
    XLSX.writeFile(wb, 'Clamalu_Vendedor.xlsx')
  }

  const st = {
    filtros: { background: 'white', borderBottom: '1px solid #e2e6f0', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6b7a99' },
    select: { border: '1.5px solid #e2e6f0', borderRadius: 8, padding: '6px 28px 6px 10px', fontSize: 12, fontWeight: 500, background: '#f4f6fb', color: '#0f1729', cursor: 'pointer', outline: 'none', appearance: 'none' },
    kpiBar: { background: 'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' },
    kpi: { textAlign: 'center', padding: '8px 16px', borderRight: '1px solid rgba(255,255,255,0.12)' },
    kpiVal: { fontSize: 38, fontWeight: 800, color: 'white', letterSpacing: -1, lineHeight: 1 },
    kpiLbl: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 5 },
    page: { padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
    card: { background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(19,65,196,0.08)', border: '1px solid #e2e6f0', padding: '18px 20px' },
    cardTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6b7a99', marginBottom: 16 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
    th: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#6b7a99', padding: '0 8px 10px', borderBottom: '2px solid #e2e6f0', textAlign: 'left' },
    td: { padding: '8px 8px', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#0f1729', verticalAlign: 'middle' },
    btnExport: { marginLeft: 'auto', padding: '6px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    btnLimpar: { padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e2e6f0', background: 'white', color: '#6b7a99', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  }

  // barra horizontal (HTML) com realce em duas partes: realçado (forte) + restante (esmaecido)
  function Barra({ nome, total, hi, max, cor, direita, onClick, larguraNome = 64 }) {
    const totalPct = max > 0 ? (total / max * 100) : 0
    const hiFrac = total > 0 ? Math.min(1, hi / total) : 0
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
        <div style={{ width: larguraNome, fontSize: 12, fontWeight: 700, textAlign: 'right', color: '#374151' }}>{nome}</div>
        <div style={{ flex: 1, height: 22, background: '#f4f6fb', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: totalPct + '%', height: '100%', display: 'flex', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: (hiFrac * 100) + '%', height: '100%', background: cor }} />
            <div style={{ flex: 1, height: '100%', background: fade(cor) }} />
          </div>
        </div>
        <div style={{ width: 110, fontSize: 11, color: '#6b7a99', textAlign: 'right' }}>{direita}</div>
      </div>
    )
  }

  // ranking por segmento: sai das linhas (e não do servidor) para o realce funcionar nele
  const porSegmento = (() => {
    const hiProd = aggBy('produto', 'valor', true)
    const seg = Object.fromEntries(SEGMENTOS.map(n => [n, { valor: 0, qtde: 0, prod: {} }]))
    for (const r of linhas) {
      const g = seg[r.segmento] || seg.Outros
      g.valor += r.valor_total; g.qtde += r.qtde
      if (!g.prod[r.produto]) g.prod[r.produto] = { produto: r.produto, valor: 0, qtde: 0 }
      g.prod[r.produto].valor += r.valor_total; g.prod[r.produto].qtde += r.qtde
    }
    const total = SEGMENTOS.reduce((t, n) => t + seg[n].valor, 0)
    return SEGMENTOS.map(n => {
      const g = seg[n]
      const produtos = Object.values(g.prod).sort((x, y) => y.valor - x.valor)
        .map(p => ({ ...p, hi: hiProd[p.produto] || 0, pct: g.valor > 0 ? p.valor / g.valor * 100 : 0 }))
      return { segmento: n, valor: g.valor, qtde: g.qtde, produtos,
        hi: produtos.reduce((t, p) => t + p.hi, 0),
        pct: total > 0 ? g.valor / total * 100 : 0 }
    })
  })()
  const fmtPct = v => v.toFixed(1).replace('.', ',') + '%'

  // faturamento de cada vendedor aberto por segmento (mesma ordem de porVendedor)
  const segPorVend = (dados?.porVendedor || []).map(v => {
    const m = Object.fromEntries(SEGMENTOS.map(n => [n, 0]))
    for (const r of linhas) if (r.vendedor === v.vendedor) m[r.segmento in m ? r.segmento : 'Outros'] += r.valor_total
    return { vendedor: v.vendedor, total: v.valor, ...m }
  })

  // doughnut clientes por vendedor — esmaece os que não contribuem para o realce
  const dough = {
    labels: dados?.porVendedor?.map(v => v.vendedor) || [],
    datasets: [{
      data: dados?.porVendedor?.map(v => v.clientes) || [],
      backgroundColor: dados?.porVendedor?.map(v => {
        const c = corVendedor(v.vendedor, todosVends)
        return contribui('vendedor', v.vendedor) ? c : fade(c)
      }) || [], borderWidth: 3, borderColor: '#fff'
    }]
  }
  const doughOpts = { cutout: '55%', responsive: true, plugins: { legend: { display: false } },
    onClick: (e, els) => { if (els.length) pick('vendedor', dados.porVendedor[els[0].index].vendedor) } }

  // tabelas: quando há realce, elas são FILTRADAS (recalculadas só com o item clicado)
  function tabelaAgrupada(catKey) {
    const base = sel ? linhas.filter(r => r[sel.dim] === sel.value) : linhas
    const m = {}; let total = 0
    for (const r of base) {
      const k = r[catKey]
      if (!m[k]) m[k] = { chave: k, uf: r.uf, qtd: 0, valor: 0 }
      m[k].qtd += r.qtde; m[k].valor += r.valor_total; total += r.valor_total
    }
    return Object.values(m).map(d => ({
      ...d, valor: Math.round(d.valor * 100) / 100,
      pct: total > 0 ? Math.round(d.valor / total * 10000) / 100 : 0
    })).sort((a, b) => b.valor - a.valor).slice(0, 50)
  }
  // sem realce usa o ranking do servidor (top 10); com realce usa o recalculado
  const tabCli = sel
    ? tabelaAgrupada('cliente').map(d => ({ cliente: d.chave, uf: d.uf, qtd: d.qtd, valor: d.valor, pct: d.pct }))
    : (dados?.tabelaClientes || [])
  const tabProd = sel
    ? tabelaAgrupada('produto').map(d => ({ produto: d.chave, qtde: d.qtd, valor: d.valor, pct: d.pct }))
    : (dados?.tabelaProdutos || [])

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 13 }}>
      <Head><title>Clamalu · Vendedor</title></Head>

      {/* HEADER */}
      <div style={{ background: '#0b2a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 58, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0b2a8a' }}>CL</div>
          <div><div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Clamalu</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['vendedor','produto','cliente','comparacao','financeiro'].filter(p => user?.paginas?.includes(p)).map(p => (
            <button key={p} onClick={() => router.push('/dashboard/'+p)}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: p === 'vendedor' ? 'white' : 'rgba(255,255,255,0.1)', color: p === 'vendedor' ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
              {p === 'comparacao' ? 'Comparação' : p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          {user?.role === 'admin' && <button onClick={() => router.push('/admin')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white', marginLeft: 8 }}>⚙ Admin</button>}
          <button onClick={async () => { await fetch('/api/auth/logout',{method:'POST'}); router.push('/') }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(220,38,38,0.7)', color: 'white', marginLeft: 4 }}>Sair</button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={st.filtros}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Ano</span>
          <MultiSelect options={opcoes.anos} value={fAno} onChange={setFAno} accent="#a3b4f5" minWidth={110} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Mês</span>
          <MultiSelect options={MESES_OPC} value={fMes} onChange={setFMes} accent="#f5a3a3" minWidth={120} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Vendedor</span>
          <MultiSelect options={opcoes.vendedores.filter(v => !(user?.vendedores_ocultos || []).includes(v))} value={fVend} onChange={setFVend} accent="#f5d6a3" minWidth={120} />
        </div>
        <button style={st.btnLimpar} onClick={() => { setFAno([]); setFMes([]); setFVend([]) }}>✕ Limpar</button>
        <button style={st.btnExport} onClick={exportar}>⬇ Exportar Excel</button>
      </div>

      {/* BARRA DE REALCE ATIVO */}
      {sel && (
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '8px 28px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#9a3412' }}>
          <span>🔦 Realçando <strong>{sel.value}</strong> <span style={{ color: '#b45309' }}>({sel.dim})</span> em todos os gráficos. Os dados não foram filtrados.</span>
          <button onClick={() => setSel(null)} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: '1px solid #fdba74', background: 'white', color: '#9a3412', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕ Limpar realce</button>
        </div>
      )}

      {/* KPIs */}
      <div style={st.kpiBar}>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtN(dados?.kpis?.qtde)}</div><div style={st.kpiLbl}>Total Produtos</div></div>
        <div style={{ ...st.kpi, borderRight: 'none' }}><div style={st.kpiVal}>{loading ? '...' : fmtVal(dados?.kpis?.valor)}</div><div style={st.kpiLbl}>Valor Total</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtN(dados?.kpis?.clientes)}</div><div style={st.kpiLbl}>Qtd. Clientes</div></div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>Carregando dados...</div> : (
        <div style={st.page}>
          {/* VENDEDOR: VALOR + CLIENTES */}
          <div style={st.row2}>
            <div style={st.card}>
              <div style={st.cardTitle}>Valor total por vendedor <span style={{ fontWeight: 500, textTransform: 'none', color: '#9aa6bf' }}>· clique para realçar</span></div>
              {(() => {
                const max = dados?.porVendedor?.[0]?.valor || 1
                const hiMap = aggBy('vendedor', 'valor', true)
                return dados?.porVendedor?.map((v, i) => (
                  <Barra key={i} nome={v.vendedor} total={v.valor} hi={hiMap[v.vendedor] || 0} max={max}
                    cor={corVendedor(v.vendedor, todosVends)} direita={`${fmtVal(v.valor)} · ${v.pct}%`}
                    onClick={() => pick('vendedor', v.vendedor)} />
                ))
              })()}
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Clientes por vendedor</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 150, height: 150 }}>
                  <Doughnut data={dough} options={doughOpts} />
                </div>
                <div style={{ flex: 1 }}>
                  {dados?.porVendedor?.map((v,i) => (
                    <div key={i} onClick={() => pick('vendedor', v.vendedor)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', opacity: contribui('vendedor', v.vendedor) ? 1 : 0.4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: corVendedor(v.vendedor, todosVends) }} />
                      <span style={{ fontSize: 12, fontWeight: isSel('vendedor', v.vendedor) ? 800 : 600, flex: 1 }}>{v.vendedor}</span>
                      <span style={{ fontSize: 11, color: '#6b7a99' }}>{v.clientes} cli.</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1341c4' }}>{v.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FATURAMENTO POR VENDEDOR E SEGMENTO */}
          <div style={st.card}>
            <div style={{ ...st.cardTitle, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Faturamento por vendedor e segmento</span>
              {SEGMENTOS.map(n => (
                <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textTransform: 'none', fontWeight: 600, color: '#374151' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COR_SEGMENTO[n] }} />{n}
                </span>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={st.th}>Vendedor</th>
                <th style={{ ...st.th, width: '38%' }}>Divisão</th>
                {SEGMENTOS.map(n => <th key={n} style={{ ...st.th, textAlign: 'right' }}>{n}</th>)}
                <th style={{ ...st.th, textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {segPorVend.map(v => (
                  <tr key={v.vendedor} onClick={() => pick('vendedor', v.vendedor)} style={{ cursor: 'pointer', background: isSel('vendedor', v.vendedor) ? '#e8eeff' : '', opacity: contribui('vendedor', v.vendedor) ? 1 : 0.45 }}>
                    <td style={{ ...st.td, fontWeight: 700 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: corVendedor(v.vendedor, todosVends), marginRight: 6 }} />{v.vendedor}
                    </td>
                    <td style={st.td}>
                      <div style={{ display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden', gap: 1, background: '#f4f6fb' }}>
                        {SEGMENTOS.map(n => v[n] > 0 && (
                          <div key={n} title={`${n}: ${fmtVal(v[n])} · ${fmtPct(v.total > 0 ? v[n] / v.total * 100 : 0)}`}
                            style={{ flex: v[n], minWidth: 2, background: COR_SEGMENTO[n] }} />
                        ))}
                      </div>
                    </td>
                    {SEGMENTOS.map(n => (
                      <td key={n} style={{ ...st.td, textAlign: 'right' }}>
                        {fmtVal(v[n])}<div style={{ fontSize: 10, color: '#9aa6bf' }}>{fmtPct(v.total > 0 ? v[n] / v.total * 100 : 0)}</div>
                      </td>
                    ))}
                    <td style={{ ...st.td, textAlign: 'right', fontWeight: 700 }}>{fmtVal(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* RANKING DE PRODUTOS POR SEGMENTO */}
          <div style={st.card}>
            <div style={st.cardTitle}>Ranking de produtos por segmento <span style={{ fontWeight: 500, textTransform: 'none', color: '#9aa6bf' }}>· Culturas = FERM. · Enzimas = CHYMAX EXTRA, M, SUPREME e YIELDMAX · clique para realçar</span></div>
            <div style={st.row3}>
              {porSegmento.map(g => {
                const cor = COR_SEGMENTO[g.segmento]
                const max = g.produtos[0]?.valor || 1
                return (
                  <div key={g.segmento} style={{ minWidth: 0 }}>
                    <div onClick={() => pick('segmento', g.segmento)}
                      style={{ cursor: 'pointer', borderRadius: 10, padding: '12px 14px', marginBottom: 12, borderLeft: `4px solid ${cor}`, background: fade(cor, isSel('segmento', g.segmento) ? '33' : '14') }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#374151' }}>{g.segmento}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f1729' }}>{fmtVal(g.valor)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{fmtPct(g.pct)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>
                        {g.produtos.length} produtos · {fmtN(g.qtde)} un.
                        {sel && sel.dim !== 'segmento' && g.hi > 0 && <> · <strong style={{ color: '#9a3412' }}>{fmtVal(g.hi)} de {sel.value}</strong></>}
                      </div>
                    </div>
                    <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                      {g.produtos.length === 0 && <div style={{ fontSize: 12, color: '#9aa6bf' }}>Nenhuma venda no período.</div>}
                      {g.produtos.map((p, i) => {
                        const hiFrac = p.valor > 0 ? Math.min(1, p.hi / p.valor) : 0
                        return (
                          <div key={p.produto} onClick={() => pick('produto', p.produto)} style={{ marginBottom: 9, cursor: 'pointer', opacity: contribui('produto', p.produto) ? 1 : 0.45 }}>
                            <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
                              <span style={{ color: '#9aa6bf', width: 18, textAlign: 'right' }}>{i + 1}</span>
                              <span style={{ flex: 1, fontWeight: isSel('produto', p.produto) ? 800 : 600, color: '#0f1729', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.produto}</span>
                              <span style={{ color: '#6b7a99' }}>{fmtPct(p.pct)}</span>
                              <span style={{ fontWeight: 700, width: 72, textAlign: 'right' }}>{fmtVal(p.valor)}</span>
                            </div>
                            <div style={{ marginLeft: 24, height: 6, background: '#f4f6fb', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: (p.valor / max * 100) + '%', height: '100%', display: 'flex' }}>
                                <div style={{ width: (sel ? hiFrac * 100 : 100) + '%', height: '100%', background: cor }} />
                                <div style={{ flex: 1, height: '100%', background: fade(cor) }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TABELAS */}
          <div style={st.row2}>
            <div style={st.card}>
              <div style={st.cardTitle}>Ranking de clientes {sel && <span style={{ fontWeight: 500, textTransform: 'none', color: '#ea8c00' }}>· filtrado por {sel.value}</span>}</div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>QTDE</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>%</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>Valor</th>
                  </tr></thead>
                  <tbody>
                    {tabCli.length === 0 && <tr><td style={{ ...st.td, color: '#9aa6bf' }} colSpan={6}>Nenhum cliente para este realce.</td></tr>}
                    {tabCli.map((c, i) => (
                      <tr key={i} onClick={() => pick('cliente', c.cliente)} style={{ cursor: 'pointer', background: isSel('cliente', c.cliente) ? '#e8eeff' : '' }}>
                        <td style={st.td}><span style={{ display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700 }}>{i+1}</span></td>
                        <td style={{ ...st.td, fontWeight: 600, fontSize: 11 }}>{c.cliente}</td>
                        <td style={st.td}><span style={{ padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'#e8eeff',color:'#1341c4' }}>{c.uf}</span></td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{fmtN(c.qtd)}</td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{c.pct}%</td>
                        <td style={{ ...st.td, textAlign: 'right', fontWeight: 700 }}>{fmtVal(c.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Ranking de produtos {sel && <span style={{ fontWeight: 500, textTransform: 'none', color: '#ea8c00' }}>· filtrado por {sel.value}</span>}</div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={st.th}>#</th><th style={st.th}>Produto</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>%</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>QTDE</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>Valor</th>
                  </tr></thead>
                  <tbody>
                    {tabProd.length === 0 && <tr><td style={{ ...st.td, color: '#9aa6bf' }} colSpan={5}>Nenhum produto para este realce.</td></tr>}
                    {tabProd.map((p, i) => (
                      <tr key={i} onClick={() => pick('produto', p.produto)} style={{ cursor: 'pointer', background: isSel('produto', p.produto) ? '#e8eeff' : '' }}>
                        <td style={st.td}><span style={{ display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700 }}>{i+1}</span></td>
                        <td style={{ ...st.td, fontWeight: 600, fontSize: 11 }}>{p.produto}</td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{p.pct}%</td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{fmtN(p.qtde)}</td>
                        <td style={{ ...st.td, textAlign: 'right', fontWeight: 700 }}>{fmtVal(p.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps({ req }) {
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (!user) return { redirect: { destination: '/', permanent: false } }
  if (!user.paginas?.includes('vendedor')) return { redirect: { destination: '/dashboard/' + (user.paginas?.[0] || ''), permanent: false } }
  return { props: { user } }
}
