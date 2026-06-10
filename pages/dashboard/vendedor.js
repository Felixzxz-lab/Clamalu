import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const CORES = { THIAGO: '#1341c4', WENDEL: '#16a34a', CLEBER: '#dc2626', CLAMALU: '#ea8c00' }
const AZUIS = ['#1341c4','#2a5ae0','#4a78f5','#7399f8','#93aafc']

function fmtVal(v) { if (!v) return '—'; if (v >= 1e6) return 'R$ ' + (v/1e6).toFixed(2).replace('.',',') + ' Mi'; if (v >= 1e3) return 'R$ ' + (v/1e3).toFixed(0) + ' Mil'; return 'R$ ' + Math.round(v) }
function fmtN(v) { return Number(Math.round(v||0)).toLocaleString('pt-BR') }

export default function Vendedor({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState('')
  const [fMes, setFMes] = useState('')
  const [fVend, setFVend] = useState('')

  useEffect(() => { carregar() }, [fAno, fMes, fVend])

  async function carregar() {
    setLoading(true)
    const p = new URLSearchParams()
    if (fAno) p.set('ano', fAno)
    if (fMes) p.set('mes', fMes)
    if (fVend) p.set('vendedor', fVend)
    const r = await fetch('/api/dados/vendedor?' + p)
    if (r.status === 401) { router.push('/'); return }
    const d = await r.json()
    setDados(d)
    setLoading(false)
  }

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
          {['vendedor','produto','cliente','comparacao'].filter(p => user?.paginas?.includes(p)).map(p => (
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
          <select style={{ ...st.select, borderColor: '#a3b4f5' }} value={fAno} onChange={e => setFAno(e.target.value)}>
            <option value="">Todos</option><option>2024</option><option>2025</option><option>2026</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Mês</span>
          <select style={{ ...st.select, borderColor: '#f5a3a3' }} value={fMes} onChange={e => setFMes(e.target.value)}>
            <option value="">Todos</option>
            {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={st.label}>Vendedor</span>
          <select style={{ ...st.select, borderColor: '#f5d6a3' }} value={fVend} onChange={e => setFVend(e.target.value)}>
            <option value="">Todos</option><option>THIAGO</option><option>WENDEL</option><option>CLEBER</option><option>CLAMALU</option>
          </select>
        </div>
        <button style={st.btnLimpar} onClick={() => { setFAno(''); setFMes(''); setFVend('') }}>✕ Limpar</button>
        <button style={st.btnExport} onClick={exportar}>⬇ Exportar Excel</button>
      </div>

      {/* KPIs */}
      <div style={st.kpiBar}>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtN(dados?.kpis?.qtde)}</div><div style={st.kpiLbl}>Total Produtos</div></div>
        <div style={{ ...st.kpi, borderRight: 'none' }}><div style={st.kpiVal}>{loading ? '...' : fmtVal(dados?.kpis?.valor)}</div><div style={st.kpiLbl}>Valor Total</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading ? '...' : fmtN(dados?.kpis?.clientes)}</div><div style={st.kpiLbl}>Qtd. Clientes</div></div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>Carregando dados...</div> : (
        <div style={st.page}>
          {/* BARRAS VENDEDOR */}
          <div style={st.row2}>
            <div style={st.card}>
              <div style={st.cardTitle}>Valor total por vendedor</div>
              {dados?.porVendedor?.map((v, i) => {
                const max = dados.porVendedor[0]?.valor || 1
                const pct = (v.valor/max*100).toFixed(0)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 64, fontSize: 12, fontWeight: 700, textAlign: 'right', color: '#374151' }}>{v.vendedor}</div>
                    <div style={{ flex: 1, height: 22, background: '#f4f6fb', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: pct+'%', height: '100%', background: CORES[v.vendedor]||'#1341c4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{v.pct}%</span>
                      </div>
                    </div>
                    <div style={{ width: 100, fontSize: 11, color: '#6b7a99', textAlign: 'right' }}>{fmtVal(v.valor)}</div>
                  </div>
                )
              })}
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Quantidade por vendedor</div>
              {dados?.porVendedor?.map((v, i) => {
                const max = Math.max(...dados.porVendedor.map(x=>x.qtde)) || 1
                const pct = (v.qtde/max*100).toFixed(0)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 64, fontSize: 12, fontWeight: 700, textAlign: 'right', color: '#374151' }}>{v.vendedor}</div>
                    <div style={{ flex: 1, height: 22, background: '#f4f6fb', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: pct+'%', height: '100%', background: CORES[v.vendedor]||'#1341c4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ width: 80, fontSize: 11, color: '#6b7a99', textAlign: 'right' }}>{fmtN(v.qtde)} un.</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RANKING PRODUTO + PIZZA */}
          <div style={st.row3}>
            <div style={st.card}>
              <div style={st.cardTitle}>Ranking de produtos</div>
              <div style={{ height: 200 }}>
                <Bar data={{
                  labels: dados?.topProdQtde?.map(p => p.produto.length > 18 ? p.produto.slice(0,18)+'…' : p.produto) || [],
                  datasets: [{ data: dados?.topProdQtde?.map(p => p.qtde) || [], backgroundColor: AZUIS, borderRadius: 4 }]
                }} options={{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{color:'#f0f2f8'}},y:{grid:{display:false}}} }} />
              </div>
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Clientes por vendedor</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 150, height: 150 }}>
                  <Doughnut data={{
                    labels: dados?.porVendedor?.map(v=>v.vendedor) || [],
                    datasets: [{ data: dados?.porVendedor?.map(v=>v.clientes) || [], backgroundColor: dados?.porVendedor?.map(v=>CORES[v.vendedor]||'#888') || [], borderWidth: 3, borderColor: '#fff' }]
                  }} options={{ cutout:'55%', responsive:true, plugins:{legend:{display:false}} }} />
                </div>
                <div style={{ flex: 1 }}>
                  {dados?.porVendedor?.map((v,i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: CORES[v.vendedor]||'#888' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{v.vendedor}</span>
                      <span style={{ fontSize: 11, color: '#6b7a99' }}>{v.clientes} cli.</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1341c4' }}>{v.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Top produtos por valor</div>
              {dados?.topProdValor?.map((p, i) => {
                const max = dados.topProdValor[0]?.valor || 1
                const pct = (p.valor/max*100).toFixed(0)
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0f1729', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.produto}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, background: '#f4f6fb', borderRadius: 3 }}>
                        <div style={{ width: pct+'%', height: '100%', background: AZUIS[i], borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7a99', width: 70, textAlign: 'right' }}>{fmtVal(p.valor)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TABELAS */}
          <div style={st.row2}>
            <div style={st.card}>
              <div style={st.cardTitle}>Ranking de clientes</div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>QTDE</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>%</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>Valor</th>
                  </tr></thead>
                  <tbody>
                    {dados?.tabelaClientes?.map((c, i) => (
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f7f9ff'} onMouseLeave={e=>e.currentTarget.style.background=''}>
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
              <div style={st.cardTitle}>Ranking de produtos</div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={st.th}>#</th><th style={st.th}>Produto</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>%</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>QTDE</th>
                    <th style={{ ...st.th, textAlign: 'right' }}>Valor</th>
                  </tr></thead>
                  <tbody>
                    {dados?.tabelaProdutos?.map((p, i) => (
                      <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#f7f9ff'} onMouseLeave={e=>e.currentTarget.style.background=''}>
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
