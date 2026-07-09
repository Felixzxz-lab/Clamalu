import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { fade, aggBy, contribui, tabelaAgrupada } from '../../lib/realce'
import { RealceBanner } from '../../components/realce'
import { MultiSelect, ANOS_OPC, MESES_OPC, VEND_OPC } from '../../components/MultiSelect'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const COR_UFS = { GO:'#1341c4',MT:'#16a34a',PA:'#dc2626',TO:'#ea8c00',RO:'#7c3aed',DF:'#0891b2' }
const AZUIS = ['#1341c4','#2a5ae0','#4a78f5','#7399f8','#93aafc','#b5c5fd']
function fmtVal(v){if(!v)return'—';if(v>=1e6)return'R$ '+(v/1e6).toFixed(2).replace('.',',')+' Mi';if(v>=1e3)return'R$ '+(v/1e3).toFixed(0)+' Mil';return'R$ '+Math.round(v)}
function fmtN(v){return Number(Math.round(v||0)).toLocaleString('pt-BR')}

export default function Produto({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState([])
  const [fMes, setFMes] = useState([])
  const [fVend, setFVend] = useState([])
  const [prodAtivo, setProdAtivo] = useState(null)
  const [expandido, setExpandido] = useState(false)
  const [sel, setSel] = useState(null)

  useEffect(() => { carregar() }, [fAno, fMes, fVend])
  useEffect(() => { if (dados?.prodUf?.length) setProdAtivo(dados.prodUf[0].produto) }, [dados])

  async function carregar() {
    setLoading(true)
    const p = new URLSearchParams()
    if (fAno.length) p.set('ano', fAno.join(','))
    if (fMes.length) p.set('mes', fMes.join(','))
    if (fVend.length) p.set('vendedor', fVend.join(','))
    const r = await fetch('/api/dados/produto?' + p)
    if (r.status === 401) { router.push('/'); return }
    setDados(await r.json())
    setSel(null)
    setLoading(false)
    setExpandido(false)
  }

  const linhas = dados?.linhas || []
  function pick(dim, value) {
    if (!value) return
    setSel(s => (s && s.dim === dim && s.value === value) ? null : { dim, value })
    if (dim === 'produto') setProdAtivo(value)
  }
  const isSel = (dim, value) => sel && sel.dim === dim && sel.value === value

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const s1 = [['Produto','% Valor','QTDE','Valor Total'], ...(dados?.tabelaProdutos||[]).map(d=>[d.produto,d.pct,d.qtde,d.valor])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Ranking Produtos')
    const s2 = [['Produto','UF','% no produto','Valor']]
    ;(dados?.prodUf||[]).forEach(p => p.ufs.forEach(u => s2.push([p.produto, u.uf, u.pct, u.valor])))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Produto por Região')
    const s3 = [['UF','% Valor','QTDE','Valor'], ...(dados?.ufTotal||[]).map(u=>[u.uf,u.pct,u.qtde,u.valor])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Participação UF')
    XLSX.writeFile(wb, 'Clamalu_Produto.xlsx')
  }

  const st = {
    header: { background:'#0b2a8a',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',height:58,position:'sticky',top:0,zIndex:100 },
    filtros: { background:'white',borderBottom:'1px solid #e2e6f0',padding:'10px 28px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' },
    label: { fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' },
    select: { border:'1.5px solid #e2e6f0',borderRadius:8,padding:'6px 28px 6px 10px',fontSize:12,fontWeight:500,background:'#f4f6fb',color:'#0f1729',cursor:'pointer',outline:'none',appearance:'none' },
    kpiBar: { background:'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)',padding:'20px 28px',display:'grid',gridTemplateColumns:'repeat(3,1fr)' },
    kpi: { textAlign:'center',padding:'8px 16px',borderRight:'1px solid rgba(255,255,255,0.12)' },
    kpiVal: { fontSize:38,fontWeight:800,color:'white',letterSpacing:-1,lineHeight:1 },
    kpiLbl: { fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.8px',marginTop:5 },
    page: { padding:'20px 28px',display:'flex',flexDirection:'column',gap:16 },
    card: { background:'white',borderRadius:12,boxShadow:'0 2px 8px rgba(19,65,196,0.08)',border:'1px solid #e2e6f0',padding:'18px 20px' },
    cardTitle: { fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:16 },
    th: { fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.7px',color:'#6b7a99',padding:'0 8px 10px',borderBottom:'2px solid #e2e6f0',textAlign:'left' },
    td: { padding:'8px 8px',borderBottom:'1px solid #f3f4f6',fontSize:12,color:'#0f1729',verticalAlign:'middle' },
  }

  const prodUfAtivo = dados?.prodUf?.find(p => p.produto === prodAtivo)
  const principais = prodUfAtivo?.ufs?.slice(0,5) || []
  const extras = prodUfAtivo?.ufs?.slice(5) || []

  // gráficos de barras (top5) com realce two-tone
  function barTop(lista, measure) {
    const hi = aggBy(linhas, 'produto', measure, sel)
    const val = p => measure === 'qtde' ? p.qtde : p.valor
    const full = lista.map(p => p.produto)
    return {
      data: {
        labels: lista.map(p => p.produto.length > 20 ? p.produto.slice(0,20)+'…' : p.produto),
        datasets: [
          { label:'Realçado', stack:'s', borderRadius:4, data: lista.map(p => Math.min(val(p), hi[p.produto]||0)), backgroundColor: lista.map((_,i)=>AZUIS[i%AZUIS.length]) },
          { label:'Restante', stack:'s', borderRadius:4, data: lista.map(p => Math.max(0, val(p)-(hi[p.produto]||0))), backgroundColor: lista.map((_,i)=>fade(AZUIS[i%AZUIS.length])) },
        ]
      },
      opts: {
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        onClick:(e,els)=>{ if(els.length) pick('produto', full[els[0].index]) },
        plugins:{legend:{display:false}}, scales:{x:{stacked:true,grid:{color:'#f0f2f8'}},y:{stacked:true,grid:{display:false}}}
      }
    }
  }
  const bV = barTop(dados?.top5Valor || [], 'valor')
  const bQ = barTop(dados?.top5Qtde || [], 'qtde')

  // doughnut UF com esmaecimento dos que não contribuem
  const dough = {
    labels: dados?.ufTotal?.map(u=>u.uf) || [],
    datasets: [{ data: dados?.ufTotal?.map(u=>u.pct) || [],
      backgroundColor: dados?.ufTotal?.map(u => contribui(linhas,'uf',u.uf,sel) ? (COR_UFS[u.uf]||'#9ca3af') : fade(COR_UFS[u.uf]||'#9ca3af')) || [],
      borderWidth:3, borderColor:'#fff' }]
  }
  const doughOpts = { cutout:'55%', responsive:true, plugins:{legend:{display:false}},
    onClick:(e,els)=>{ if(els.length) pick('uf', dados.ufTotal[els[0].index].uf) } }

  // ranking de produtos: filtra quando há realce
  const tabProd = sel
    ? tabelaAgrupada(linhas,'produto',sel).map(d=>({ produto:d.chave, qtde:d.qtd, valor:d.valor, pct:d.pct })).slice(0,80)
    : (dados?.tabelaProdutos || [])

  return (
    <div style={{ minHeight:'100vh',background:'#f4f6fb',fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:13 }}>
      <Head><title>Clamalu · Produto</title></Head>
      <div style={st.header}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0b2a8a' }}>CL</div>
          <div><div style={{ color:'white',fontSize:16,fontWeight:700 }}>Clamalu</div><div style={{ color:'rgba(255,255,255,0.5)',fontSize:11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {['vendedor','produto','cliente','comparacao','financeiro'].filter(p=>user?.paginas?.includes(p)).map(p=>(
            <button key={p} onClick={()=>router.push('/dashboard/'+p)} style={{ padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'uppercase',background:p==='produto'?'white':'rgba(255,255,255,0.1)',color:p==='produto'?'#0b2a8a':'rgba(255,255,255,0.75)' }}>
              {p==='comparacao'?'Comparação':p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          {user?.role==='admin'&&<button onClick={()=>router.push('/admin')} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(255,255,255,0.15)',color:'white',marginLeft:8 }}>⚙ Admin</button>}
          <button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.push('/')}} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(220,38,38,0.7)',color:'white',marginLeft:4 }}>Sair</button>
        </div>
      </div>

      <div style={st.filtros}>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Ano</span>
          <MultiSelect options={ANOS_OPC} value={fAno} onChange={setFAno} accent="#a3b4f5" minWidth={110} /></div>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Mês</span>
          <MultiSelect options={MESES_OPC} value={fMes} onChange={setFMes} accent="#f5a3a3" minWidth={120} /></div>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Vendedor</span>
          <MultiSelect options={user?.vendedores?.length ? user.vendedores : VEND_OPC} value={fVend} onChange={setFVend} accent="#a3dbb4" minWidth={120} /></div>
        <button style={{ padding:'6px 14px',borderRadius:8,border:'1.5px solid #e2e6f0',background:'white',color:'#6b7a99',fontSize:12,fontWeight:500,cursor:'pointer' }} onClick={()=>{setFAno([]);setFMes([]);setFVend([])}}>✕ Limpar</button>
        <button style={{ marginLeft:'auto',padding:'6px 16px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontSize:12,fontWeight:600,cursor:'pointer' }} onClick={exportar}>⬇ Exportar Excel</button>
      </div>

      <RealceBanner sel={sel} onClear={() => setSel(null)} />

      <div style={st.kpiBar}>
        <div style={st.kpi}><div style={st.kpiVal}>{loading?'...':fmtN(dados?.kpis?.qtde)}</div><div style={st.kpiLbl}>Total Produtos</div></div>
        <div style={{ ...st.kpi,borderRight:'none' }}><div style={st.kpiVal}>{loading?'...':fmtVal(dados?.kpis?.valor)}</div><div style={st.kpiLbl}>Valor Total</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading?'...':(dados?.tabelaProdutos?.length||0)}</div><div style={st.kpiLbl}>Produtos</div></div>
      </div>

      {loading?<div style={{ padding:40,textAlign:'center',color:'#6b7a99' }}>Carregando dados...</div>:(
        <div style={st.page}>
          {/* TOP 5 */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            <div style={st.card}>
              <div style={st.cardTitle}>Top 5 por valor <span style={{ fontWeight:500,textTransform:'none',color:'#9aa6bf' }}>· clique para realçar</span></div>
              <div style={{ height:200 }}><Bar data={bV.data} options={bV.opts} /></div>
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Top 5 por quantidade</div>
              <div style={{ height:200 }}><Bar data={bQ.data} options={bQ.opts} /></div>
            </div>
          </div>

          {/* REGIÃO */}
          <div style={st.card}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
              <span style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>% de vendas por região (UF) — por produto</span>
              <span style={{ fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'#e8eeff',color:'#1341c4' }}>Selecione um produto</span>
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:14 }}>
              {dados?.prodUf?.map(p=>(
                <button key={p.produto} onClick={()=>{setProdAtivo(p.produto);setExpandido(false)}} style={{ padding:'5px 12px',borderRadius:20,border:`1.5px solid ${prodAtivo===p.produto?'#1341c4':'#e2e6f0'}`,background:prodAtivo===p.produto?'#1341c4':'white',color:prodAtivo===p.produto?'white':'#6b7a99',fontSize:11,fontWeight:600,cursor:'pointer' }}>
                  {p.produto}
                </button>
              ))}
            </div>
            {prodUfAtivo && (
              <>
                <div style={{ display:'flex',height:24,borderRadius:6,overflow:'hidden',gap:1,marginBottom:12 }}>
                  {prodUfAtivo.ufs.map((u,i)=>(
                    <div key={i} title={`${u.uf}: ${u.pct}% · ${fmtVal(u.valor)}`} style={{ flex:u.pct,height:'100%',background:COR_UFS[u.uf]||'#9ca3af',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white',minWidth:u.pct>=8?'auto':0 }}>
                      {u.pct>=8?u.uf:''}
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:extras.length>0?8:0 }}>
                  {principais.map((u,i)=>(
                    <div key={i} style={{ background:'#f7f9ff',borderRadius:8,padding:'10px 12px',borderLeft:`3px solid ${COR_UFS[u.uf]||'#9ca3af'}` }}>
                      <div style={{ fontSize:11,fontWeight:700,color:COR_UFS[u.uf]||'#9ca3af' }}>{u.uf}</div>
                      <div style={{ fontSize:22,fontWeight:800,color:'#0f1729',margin:'2px 0' }}>{u.pct}%</div>
                      <div style={{ fontSize:10,color:'#6b7a99' }}>{fmtVal(u.valor)}</div>
                    </div>
                  ))}
                </div>
                {extras.length>0&&(
                  <>
                    <button onClick={()=>setExpandido(!expandido)} style={{ background:'none',border:'1.5px solid #e2e6f0',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:600,color:'#6b7a99',cursor:'pointer',marginBottom:8 }}>
                      {expandido?'▲ Recolher':`${extras.length} estado(s) a mais — clique para ver ▼`}
                    </button>
                    {expandido&&(
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8 }}>
                        {extras.map((u,i)=>(
                          <div key={i} style={{ background:'#f7f9ff',borderRadius:8,padding:'10px 12px',borderLeft:`3px solid ${COR_UFS[u.uf]||'#9ca3af'}` }}>
                            <div style={{ fontSize:11,fontWeight:700,color:COR_UFS[u.uf]||'#9ca3af' }}>{u.uf}</div>
                            <div style={{ fontSize:22,fontWeight:800,color:'#0f1729',margin:'2px 0' }}>{u.pct}%</div>
                            <div style={{ fontSize:10,color:'#6b7a99' }}>{fmtVal(u.valor)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* PIZZA UF + TABELA */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr',gap:16 }}>
            <div style={st.card}>
              <div style={st.cardTitle}>Participação por estado <span style={{ fontWeight:500,textTransform:'none',color:'#9aa6bf' }}>· clique p/ realçar</span></div>
              <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                <div style={{ width:140,height:140 }}>
                  <Doughnut data={dough} options={doughOpts} />
                </div>
                <div style={{ flex:1 }}>
                  {dados?.ufTotal?.map((u,i)=>(
                    <div key={i} onClick={()=>pick('uf',u.uf)} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer',opacity:contribui(linhas,'uf',u.uf,sel)?1:0.4 }}>
                      <div style={{ width:10,height:10,borderRadius:2,background:COR_UFS[u.uf]||'#9ca3af' }}/>
                      <span style={{ fontSize:12,fontWeight:isSel('uf',u.uf)?800:600,flex:1 }}>{u.uf}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:'#1341c4' }}>{u.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Ranking completo de produtos {sel && <span style={{ fontWeight:500,textTransform:'none',color:'#ea8c00' }}>· filtrado por {sel.value}</span>}</div>
              <div style={{ maxHeight:280,overflowY:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr><th style={st.th}>#</th><th style={st.th}>Produto</th><th style={{ ...st.th,textAlign:'right' }}>% Valor</th><th style={{ ...st.th,textAlign:'right' }}>QTDE</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
                  <tbody>
                    {tabProd.length===0 && <tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={5}>Nenhum produto para este realce.</td></tr>}
                    {tabProd.map((p,i)=>(
                    <tr key={i} onClick={()=>pick('produto',p.produto)} style={{ cursor:'pointer',background:isSel('produto',p.produto)?'#e8eeff':'' }}>
                      <td style={st.td}><span style={{ display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700 }}>{i+1}</span></td>
                      <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{p.produto}</td>
                      <td style={{ ...st.td,textAlign:'right' }}>{p.pct}%</td>
                      <td style={{ ...st.td,textAlign:'right' }}>{fmtN(p.qtde)}</td>
                      <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(p.valor)}</td>
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
  if (!user.paginas?.includes('produto')) return { redirect: { destination: '/dashboard/'+(user.paginas?.[0]||''), permanent: false } }
  return { props: { user } }
}
