import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { MultiSelect, MESES_OPC } from '../../components/MultiSelect'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const PAGINAS = ['vendedor', 'produto', 'cliente', 'comparacao', 'financeiro']
const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
// paleta para os grupos de despesa (tons quentes/frios distintos)
const PALETA = ['#0b2a8a', '#1341c4', '#2a5ae0', '#ea8c00', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#c026d3', '#65a30d', '#e11d48', '#0d9488', '#9333ea', '#f59e0b', '#475569', '#b45309']

function fmtVal(v) { if (!v) return 'R$ 0'; if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' Mi'; if (v >= 1e3) return 'R$ ' + (v / 1e3).toFixed(0) + ' Mil'; return 'R$ ' + Math.round(v) }
function fmtReal(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtN(v) { return Number(Math.round(v || 0)).toLocaleString('pt-BR') }
function fade(hex, a = '2e') { return (hex && hex.length === 7 ? hex : '#888888') + a }

export default function Financeiro({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState([])
  const [fMes, setFMes] = useState([])
  const [fGrupo, setFGrupo] = useState([])
  const [sel, setSel] = useState(null) // realce: { dim, value }
  const [opAno, setOpAno] = useState([])
  const [opGrupo, setOpGrupo] = useState([])

  useEffect(() => { carregar() }, [fAno, fMes, fGrupo])

  async function carregar() {
    setLoading(true)
    const p = new URLSearchParams()
    if (fAno.length) p.set('ano', fAno.join(','))
    if (fMes.length) p.set('mes', fMes.join(','))
    if (fGrupo.length) p.set('grupo', fGrupo.join(','))
    const r = await fetch('/api/dados/financeiro?' + p)
    if (r.status === 401) { router.push('/'); return }
    const d = await r.json()
    setDados(d)
    setSel(null)
    // popula as opções dos filtros a partir do retorno (só quando não filtrado, pra não "sumir" opção)
    if (!fAno.length && d?.opcoes?.anos) setOpAno(d.opcoes.anos.map(String))
    if (!fGrupo.length && d?.opcoes?.grupos) setOpGrupo(d.opcoes.grupos)
    setLoading(false)
  }

  function pick(dim, value) {
    if (!value) return
    setSel(s => (s && s.dim === dim && s.value === value) ? null : { dim, value })
  }

  const linhas = dados?.linhas || []
  function aggBy(catKey, comSel) {
    const m = {}
    for (const r of linhas) {
      if (comSel && sel && r[sel.dim] !== sel.value) continue
      m[r[catKey]] = (m[r[catKey]] || 0) + r.valor
    }
    return m
  }
  function contribui(catKey, value) {
    if (!sel) return true
    return linhas.some(r => r[catKey] === value && r[sel.dim] === sel.value)
  }
  const isSel = (dim, value) => sel && sel.dim === dim && sel.value === value

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    if (dados?.porGrupo) {
      const s1 = [['Grupo', 'Valor', '% Total'], ...dados.porGrupo.map(d => [d.grupo, d.valor, d.pct])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Por Grupo')
    }
    if (dados?.topFornecedores) {
      const s2 = [['Fornecedor', 'Categoria', 'Grupo', '% Total', 'Valor'], ...dados.topFornecedores.map(d => [d.despesa, d.categoria, d.grupo, d.pct, d.valor])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Fornecedores')
    }
    if (dados?.porMes) {
      const s3 = [['Mês', 'Valor'], ...dados.porMes.map(d => [MES_ABREV[d.mes - 1], d.valor])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Por Mês')
    }
    XLSX.writeFile(wb, 'Clamalu_Financeiro.xlsx')
  }

  const st = {
    filtros: { background: 'white', borderBottom: '1px solid #e2e6f0', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6b7a99' },
    kpiBar: { background: 'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' },
    kpi: { textAlign: 'center', padding: '8px 16px', borderRight: '1px solid rgba(255,255,255,0.12)' },
    kpiVal: { fontSize: 32, fontWeight: 800, color: 'white', letterSpacing: -1, lineHeight: 1.1 },
    kpiLbl: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 5 },
    page: { padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
    card: { background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(19,65,196,0.08)', border: '1px solid #e2e6f0', padding: '18px 20px' },
    cardTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6b7a99', marginBottom: 16 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    th: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#6b7a99', padding: '0 8px 10px', borderBottom: '2px solid #e2e6f0', textAlign: 'left' },
    td: { padding: '8px 8px', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#0f1729', verticalAlign: 'middle' },
    btnExport: { marginLeft: 'auto', padding: '6px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    btnLimpar: { padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e2e6f0', background: 'white', color: '#6b7a99', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  }

  function Barra({ nome, total, hi, max, cor, direita, onClick, larguraNome = 150 }) {
    const totalPct = max > 0 ? (total / max * 100) : 0
    const hiFrac = total > 0 ? Math.min(1, hi / total) : 0
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, cursor: 'pointer' }}>
        <div style={{ width: larguraNome, fontSize: 11, fontWeight: 600, textAlign: 'right', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
        <div style={{ flex: 1, height: 20, background: '#f4f6fb', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: totalPct + '%', height: '100%', display: 'flex', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: (hiFrac * 100) + '%', height: '100%', background: cor }} />
            <div style={{ flex: 1, height: '100%', background: fade(cor) }} />
          </div>
        </div>
        <div style={{ width: 120, fontSize: 11, color: '#6b7a99', textAlign: 'right' }}>{direita}</div>
      </div>
    )
  }

  const corGrupo = {}
  ;(dados?.porGrupo || []).forEach((g, i) => { corGrupo[g.grupo] = PALETA[i % PALETA.length] })

  // Evolução mensal (barras) — realça só a fatia do item selecionado
  const mesHi = {}
  linhas.forEach(r => { if (!sel || r[sel.dim] === sel.value) mesHi[r.mes] = (mesHi[r.mes] || 0) + r.valor })
  const mesesComDado = (dados?.porMes || []).filter(m => m.valor > 0).map(m => m.mes)
  const evoData = {
    labels: mesesComDado.map(m => MES_ABREV[m - 1]),
    datasets: [
      { label: 'Realçado', stack: 's', borderRadius: 4, data: mesesComDado.map(m => Math.min(dados.porMes[m - 1].valor, mesHi[m] || 0)), backgroundColor: '#1341c4' },
      { label: 'Restante', stack: 's', borderRadius: 4, data: mesesComDado.map(m => Math.max(0, dados.porMes[m - 1].valor - (mesHi[m] || 0))), backgroundColor: sel ? fade('#1341c4') : '#1341c4' },
    ]
  }
  const evoOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtReal(c.parsed.y) } } },
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: '#f0f2f8' }, ticks: { callback: v => fmtVal(v) } } }
  }

  // Pizza por grupo — esmaece grupos que não contribuem para o realce
  const dough = {
    labels: (dados?.porGrupo || []).map(g => g.grupo),
    datasets: [{
      data: (dados?.porGrupo || []).map(g => g.valor),
      backgroundColor: (dados?.porGrupo || []).map(g => contribui('grupo', g.grupo) ? corGrupo[g.grupo] : fade(corGrupo[g.grupo])),
      borderWidth: 3, borderColor: '#fff'
    }]
  }
  const doughOpts = {
    cutout: '58%', responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.label + ': ' + fmtReal(c.parsed) } } },
    onClick: (e, els) => { if (els.length) pick('grupo', dados.porGrupo[els[0].index].grupo) }
  }

  // Tabela de fornecedores — filtrada quando há realce
  function tabelaFornecedores() {
    const base = sel ? linhas.filter(r => r[sel.dim] === sel.value) : linhas
    const m = {}; let total = 0
    for (const r of base) {
      if (!m[r.despesa]) m[r.despesa] = { despesa: r.despesa, grupo: r.grupo, categoria: r.categoria, valor: 0 }
      m[r.despesa].valor += r.valor; total += r.valor
    }
    return Object.values(m).map(d => ({
      ...d, valor: Math.round(d.valor * 100) / 100,
      pct: total > 0 ? Math.round(d.valor / total * 10000) / 100 : 0
    })).sort((a, b) => b.valor - a.valor).slice(0, 60)
  }
  const tabForn = sel ? tabelaFornecedores() : (dados?.topFornecedores || []).slice(0, 60)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 13 }}>
      <Head><title>Clamalu · Financeiro</title></Head>

      {/* HEADER */}
      <div style={{ background: '#0b2a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 58, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0b2a8a' }}>CL</div>
          <div><div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Clamalu</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PAGINAS.filter(p => user?.paginas?.includes(p)).map(p => (
            <button key={p} onClick={() => router.push('/dashboard/' + p)}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: p === 'financeiro' ? 'white' : 'rgba(255,255,255,0.1)', color: p === 'financeiro' ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
              {p === 'comparacao' ? 'Comparação' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          {user?.role === 'admin' && <button onClick={() => router.push('/admin')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white', marginLeft: 8 }}>⚙ Admin</button>}
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(220,38,38,0.7)', color: 'white', marginLeft: 4 }}>Sair</button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={st.filtros}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Ano</span>
          <MultiSelect options={opAno} value={fAno} onChange={setFAno} accent="#a3b4f5" minWidth={100} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Mês</span>
          <MultiSelect options={MESES_OPC} value={fMes} onChange={setFMes} accent="#f5a3a3" minWidth={120} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Grupo</span>
          <MultiSelect options={opGrupo} value={fGrupo} onChange={setFGrupo} accent="#a7d8b0" minWidth={150} />
        </div>
        <button style={st.btnLimpar} onClick={() => { setFAno([]); setFMes([]); setFGrupo([]) }}>✕ Limpar</button>
        <button style={st.btnExport} onClick={exportar}>⬇ Exportar Excel</button>
      </div>

      {/* BARRA DE REALCE ATIVO */}
      {sel && (
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '8px 28px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#9a3412' }}>
          <span>🔦 Realçando <strong>{sel.value}</strong> <span style={{ color: '#b45309' }}>({sel.dim === 'grupo' ? 'grupo' : 'fornecedor'})</span> nos gráficos. Os dados não foram filtrados.</span>
          <button onClick={() => setSel(null)} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: '1px solid #fdba74', background: 'white', color: '#9a3412', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕ Limpar realce</button>
        </div>
      )}

      {/* KPIs */}
      <div style={st.kpiBar}>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtVal(dados?.kpis?.valor)}</div><div style={st.kpiLbl}>Despesa Total</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtVal(dados?.kpis?.mediaMes)}</div><div style={st.kpiLbl}>Média / Mês</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtN(dados?.kpis?.fornecedores)}</div><div style={st.kpiLbl}>Fornecedores</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : (dados?.kpis?.representatividade == null ? '—' : dados.kpis.representatividade.toFixed(1) + '%')}</div><div style={st.kpiLbl}>Despesas / Faturamento</div></div>
        <div style={{ ...st.kpi, borderRight: 'none' }}><div style={{ ...st.kpiVal, fontSize: 18, paddingTop: 6 }}>{loading ? '...' : dados?.kpis?.maiorGrupo}</div><div style={st.kpiLbl}>Maior Grupo</div></div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>Carregando dados...</div> : (
        <div style={st.page}>
          {/* EVOLUÇÃO MENSAL + PIZZA POR GRUPO */}
          <div style={st.row2}>
            <div style={st.card}>
              <div style={st.cardTitle}>Evolução mensal das despesas</div>
              <div style={{ height: 240 }}><Bar data={evoData} options={evoOpts} /></div>
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Despesas por grupo <span style={{ fontWeight: 500, textTransform: 'none', color: '#9aa6bf' }}>· clique para realçar</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 180, height: 180 }}><Doughnut data={dough} options={doughOpts} /></div>
                <div style={{ flex: 1, maxHeight: 200, overflowY: 'auto' }}>
                  {(dados?.porGrupo || []).map((g, i) => (
                    <div key={i} onClick={() => pick('grupo', g.grupo)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: 'pointer', opacity: contribui('grupo', g.grupo) ? 1 : 0.4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: corGrupo[g.grupo] }} />
                      <span style={{ fontSize: 11, fontWeight: isSel('grupo', g.grupo) ? 800 : 600, flex: 1 }}>{g.grupo}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1341c4' }}>{g.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* REPRESENTATIVIDADE: DESPESAS x FATURAMENTO */}
          <div style={st.card}>
            <div style={st.cardTitle}>Representatividade das despesas sobre o faturamento <span style={{ fontWeight: 500, textTransform: 'none', color: '#9aa6bf' }}>· despesas ÷ vendas, mês a mês</span></div>
            {(() => {
              const corPct = p => p == null ? '#9ca3af' : p >= 100 ? '#dc2626' : p >= 70 ? '#ea8c00' : '#16a34a'
              const cel = p => <td style={{ ...st.td, textAlign: 'right', fontWeight: 700, color: corPct(p) }}>{p == null ? '—' : p.toFixed(1) + '%'}</td>
              return (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={st.th}>Mês</th>
                <th style={{ ...st.th, textAlign: 'right' }}>Faturamento</th>
                <th style={{ ...st.th, textAlign: 'right' }}>Desp. total</th>
                <th style={{ ...st.th, textAlign: 'right' }}>% total</th>
                <th style={{ ...st.th, textAlign: 'right' }}>Desp. operac.</th>
                <th style={{ ...st.th, textAlign: 'right' }}>% operac.</th>
              </tr></thead>
              <tbody>
                {(dados?.porMes || []).filter(m => m.faturamento > 0 || m.valor > 0).map((m, i) => (
                  <tr key={i}>
                    <td style={{ ...st.td, fontWeight: 600 }}>{MES_ABREV[m.mes - 1]}</td>
                    <td style={{ ...st.td, textAlign: 'right' }}>{fmtReal(m.faturamento)}</td>
                    <td style={{ ...st.td, textAlign: 'right' }}>{fmtReal(m.valor)}</td>
                    {cel(m.representatividade)}
                    <td style={{ ...st.td, textAlign: 'right' }}>{fmtReal(m.valorOper)}</td>
                    {cel(m.representatividadeOper)}
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                {[['Total', 'left'], [fmtReal(dados?.kpis?.faturamento), 'right'], [fmtReal(dados?.kpis?.valor), 'right']].map(([v, a], k) => <td key={k} style={{ ...st.td, textAlign: a, fontWeight: 800, borderTop: '2px solid #e2e6f0' }}>{v}</td>)}
                <td style={{ ...st.td, textAlign: 'right', fontWeight: 800, color: corPct(dados?.kpis?.representatividade), borderTop: '2px solid #e2e6f0' }}>{dados?.kpis?.representatividade == null ? '—' : dados.kpis.representatividade.toFixed(1) + '%'}</td>
                <td style={{ ...st.td, textAlign: 'right', fontWeight: 800, borderTop: '2px solid #e2e6f0' }}>{fmtReal(dados?.kpis?.valorOper)}</td>
                <td style={{ ...st.td, textAlign: 'right', fontWeight: 800, color: corPct(dados?.kpis?.representatividadeOper), borderTop: '2px solid #e2e6f0' }}>{dados?.kpis?.representatividadeOper == null ? '—' : dados.kpis.representatividadeOper.toFixed(1) + '%'}</td>
              </tr></tfoot>
            </table>
              )
            })()}
            <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 10 }}><b>% total</b> = todas as despesas ÷ faturamento. <b>% operac.</b> = sem "Revenda / Mercadoria" (custo da mercadoria), só as despesas de operação. Quanto menor, melhor: <span style={{ color: '#16a34a', fontWeight: 600 }}>verde</span> &lt; 70% · <span style={{ color: '#ea8c00', fontWeight: 600 }}>laranja</span> 70–100% · <span style={{ color: '#dc2626', fontWeight: 600 }}>vermelho</span> &gt; 100%. Meses sem faturamento lançado aparecem como "—".</div>
          </div>

          {/* TOP FORNECEDORES (barras) */}
          <div style={st.card}>
            <div style={st.cardTitle}>Maiores fornecedores <span style={{ fontWeight: 500, textTransform: 'none', color: '#9aa6bf' }}>· clique para realçar</span></div>
            {(() => {
              const top = (dados?.topFornecedores || []).slice(0, 12)
              const max = top[0]?.valor || 1
              const hiMap = aggBy('despesa', true)
              return top.map((f, i) => (
                <Barra key={i} nome={f.despesa} total={f.valor} hi={hiMap[f.despesa] || 0} max={max}
                  cor={corGrupo[f.grupo] || '#1341c4'} direita={`${fmtReal(f.valor)} · ${f.pct}%`}
                  onClick={() => pick('despesa', f.despesa)} />
              ))
            })()}
          </div>

          {/* TABELA DE FORNECEDORES */}
          <div style={st.card}>
            <div style={st.cardTitle}>Detalhamento de fornecedores {sel && <span style={{ fontWeight: 500, textTransform: 'none', color: '#ea8c00' }}>· filtrado por {sel.value}</span>}</div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={st.th}>#</th><th style={st.th}>Fornecedor</th><th style={st.th}>Categoria</th><th style={st.th}>Grupo</th>
                  <th style={{ ...st.th, textAlign: 'right' }}>%</th>
                  <th style={{ ...st.th, textAlign: 'right' }}>Valor</th>
                </tr></thead>
                <tbody>
                  {tabForn.length === 0 && <tr><td style={{ ...st.td, color: '#9aa6bf' }} colSpan={6}>Nenhum fornecedor para este realce.</td></tr>}
                  {tabForn.map((f, i) => (
                    <tr key={i} onClick={() => pick('despesa', f.despesa)} style={{ cursor: 'pointer', background: isSel('despesa', f.despesa) ? '#e8eeff' : '' }}>
                      <td style={st.td}><span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: '#f4f6fb', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span></td>
                      <td style={{ ...st.td, fontWeight: 600, fontSize: 11 }}>{f.despesa}</td>
                      <td style={{ ...st.td, fontSize: 11, color: '#6b7a99' }}>{f.categoria || '—'}</td>
                      <td style={st.td}><span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: fade(corGrupo[f.grupo] || '#1341c4', '22'), color: corGrupo[f.grupo] || '#1341c4' }}>{f.grupo}</span></td>
                      <td style={{ ...st.td, textAlign: 'right' }}>{f.pct}%</td>
                      <td style={{ ...st.td, textAlign: 'right', fontWeight: 700 }}>{fmtReal(f.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  if (!user.paginas?.includes('financeiro')) return { redirect: { destination: '/dashboard/' + (user.paginas?.[0] || ''), permanent: false } }
  return { props: { user } }
}
