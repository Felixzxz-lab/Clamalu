import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
import { fade, contribui, tabelaAgrupada } from '../../lib/realce'
import { RealceBanner } from '../../components/realce'
import { MultiSelect, MESES_OPC, useOpcoes } from '../../components/MultiSelect'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const COR_UFS = { GO:'#1341c4',MT:'#16a34a',PA:'#dc2626',TO:'#ea8c00',RO:'#7c3aed',DF:'#0891b2' }
function fmtVal(v){if(!v)return'—';if(v>=1e6)return'R$ '+(v/1e6).toFixed(2).replace('.',',')+' Mi';if(v>=1e3)return'R$ '+(v/1e3).toFixed(0)+' Mil';return'R$ '+Math.round(v)}
function fmtN(v){return Number(Math.round(v||0)).toLocaleString('pt-BR')}

export default function Cliente({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState([])
  const [fMes, setFMes] = useState([])
  const [fVend, setFVend] = useState([])
  const [cliAtivo, setCliAtivo] = useState(null)
  const [cliCompra, setCliCompra] = useState(null) // cliente selecionado p/ "o que comprou"
  const [sel, setSel] = useState(null)
  const opcoes = useOpcoes()

  useEffect(() => { carregar() }, [fAno, fMes, fVend])
  useEffect(() => {
    if (dados?.top5Cli?.length) setCliAtivo(dados.top5Cli[0])
    if (dados?.cli50?.length) setCliCompra(dados.cli50[0].cliente)
  }, [dados])

  async function carregar() {
    setLoading(true)
    const p = new URLSearchParams()
    if (fAno.length) p.set('ano', fAno.join(','))
    if (fMes.length) p.set('mes', fMes.join(','))
    if (fVend.length) p.set('vendedor', fVend.join(','))
    const r = await fetch('/api/dados/cliente?' + p)
    if (r.status === 401) { router.push('/'); return }
    setDados(await r.json())
    setSel(null)
    setLoading(false)
  }

  const linhas = dados?.linhas || []
  function pick(dim, value) {
    if (!value) return
    setSel(s => (s && s.dim === dim && s.value === value) ? null : { dim, value })
    if (dim === 'cliente') { setCliCompra(value); if (dados?.cliMesPct?.[value]) setCliAtivo(value) }
  }
  // produtos comprados pelo cliente selecionado (no período filtrado)
  const comprasCliente = (() => {
    if (!cliCompra) return []
    const p = {}
    for (const r of linhas) { if (r.cliente !== cliCompra) continue; if (!p[r.produto]) p[r.produto] = { qtde: 0, valor: 0 }; p[r.produto].qtde += r.qtde; p[r.produto].valor += r.valor_total }
    return Object.entries(p).map(([produto, d]) => ({ produto, qtde: d.qtde, valor: Math.round(d.valor * 100) / 100 })).sort((a, b) => b.valor - a.valor).slice(0, 25)
  })()
  const totalCompra = comprasCliente.reduce((s, r) => s + r.valor, 0)
  const isSel = (dim, value) => sel && sel.dim === dim && sel.value === value

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const s1 = [['#','Cliente','UF','% Individual','% Acumulado','Valor'], ...(dados?.cli50||[]).map((d,i)=>[i+1,d.cliente,d.uf,d.pct,d.acumulado,d.valor])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Representatividade 50%')
    const s2 = [['#','Cliente','UF','% Individual','% Acumulado','Valor'], ...(dados?.cli30||[]).map((d,i)=>[i+1,d.cliente,d.uf,d.pct,d.acumulado,d.valor])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Representatividade 30%')
    const s3 = [['#','Cliente','UF','Cidade','QTDE','% Valor','Valor'], ...(dados?.ranking||[]).map((d,i)=>[i+1,d.cliente,d.uf,d.cidade,d.qtd,d.pct,d.valor])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Ranking Clientes')
    XLSX.writeFile(wb, 'Clamalu_Cliente.xlsx')
  }

  const st = {
    header:{background:'#0b2a8a',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',height:58,position:'sticky',top:0,zIndex:100},
    filtros:{background:'white',borderBottom:'1px solid #e2e6f0',padding:'10px 28px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'},
    label:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99'},
    select:{border:'1.5px solid #e2e6f0',borderRadius:8,padding:'6px 28px 6px 10px',fontSize:12,fontWeight:500,background:'#f4f6fb',color:'#0f1729',cursor:'pointer',outline:'none',appearance:'none'},
    kpiBar:{background:'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)',padding:'20px 28px',display:'grid',gridTemplateColumns:'repeat(3,1fr)'},
    kpi:{textAlign:'center',padding:'8px 16px',borderRight:'1px solid rgba(255,255,255,0.12)'},
    kpiVal:{fontSize:38,fontWeight:800,color:'white',letterSpacing:-1,lineHeight:1},
    kpiLbl:{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.8px',marginTop:5},
    page:{padding:'20px 28px',display:'flex',flexDirection:'column',gap:16},
    card:{background:'white',borderRadius:12,boxShadow:'0 2px 8px rgba(19,65,196,0.08)',border:'1px solid #e2e6f0',padding:'18px 20px'},
    th:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.7px',color:'#6b7a99',padding:'0 8px 10px',borderBottom:'2px solid #e2e6f0',textAlign:'left'},
    td:{padding:'8px 8px',borderBottom:'1px solid #f3f4f6',fontSize:12,color:'#0f1729',verticalAlign:'middle'},
  }

  const cliMesData = dados && cliAtivo && dados.cliMesPct?.[cliAtivo]
  const mesesLabel = dados?.meses?.map(m => { const [y,mo]=m.split('-'); return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mo)-1]+'/'+y.slice(2) }) || []

  // ranking completo de clientes: filtra quando há realce
  const ranking = sel
    ? tabelaAgrupada(linhas,'cliente',sel).map(d=>({ cliente:d.chave, uf:d.uf, qtd:d.qtd, valor:d.valor, pct:d.pct })).slice(0,80)
    : (dados?.ranking || [])

  // doughnut UF
  const dough = {
    labels: dados?.ufTotal?.map(u=>u.uf) || [],
    datasets:[{ data: dados?.ufTotal?.map(u=>u.pct) || [],
      backgroundColor: dados?.ufTotal?.map(u => contribui(linhas,'uf',u.uf,sel) ? (COR_UFS[u.uf]||'#9ca3af') : fade(COR_UFS[u.uf]||'#9ca3af')) || [],
      borderWidth:3, borderColor:'#fff' }]
  }
  const doughOpts = { cutout:'55%', responsive:true, plugins:{legend:{display:false}},
    onClick:(e,els)=>{ if(els.length) pick('uf', dados.ufTotal[els[0].index].uf) } }

  return (
    <div style={{ minHeight:'100vh',background:'#f4f6fb',fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:13 }}>
      <Head><title>Clamalu · Cliente</title></Head>
      <div style={st.header}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0b2a8a' }}>CL</div>
          <div><div style={{ color:'white',fontSize:16,fontWeight:700 }}>Clamalu</div><div style={{ color:'rgba(255,255,255,0.5)',fontSize:11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {['vendedor','produto','cliente','comparacao','financeiro'].filter(p=>user?.paginas?.includes(p)).map(p=>(
            <button key={p} onClick={()=>router.push('/dashboard/'+p)} style={{ padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'uppercase',background:p==='cliente'?'white':'rgba(255,255,255,0.1)',color:p==='cliente'?'#0b2a8a':'rgba(255,255,255,0.75)' }}>
              {p==='comparacao'?'Comparação':p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          {user?.role==='admin'&&<button onClick={()=>router.push('/admin')} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(255,255,255,0.15)',color:'white',marginLeft:8 }}>⚙ Admin</button>}
          <button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.push('/')}} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(220,38,38,0.7)',color:'white',marginLeft:4 }}>Sair</button>
        </div>
      </div>

      <div style={st.filtros}>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Ano</span><MultiSelect options={opcoes.anos} value={fAno} onChange={setFAno} accent="#a3b4f5" minWidth={110} /></div>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Mês</span><MultiSelect options={MESES_OPC} value={fMes} onChange={setFMes} accent="#f5a3a3" minWidth={120} /></div>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Vendedor</span><MultiSelect options={opcoes.vendedores.filter(v => !(user?.vendedores_ocultos || []).includes(v))} value={fVend} onChange={setFVend} accent="#a3dbb4" minWidth={120} /></div>
        <button style={{ padding:'6px 14px',borderRadius:8,border:'1.5px solid #e2e6f0',background:'white',color:'#6b7a99',fontSize:12,fontWeight:500,cursor:'pointer' }} onClick={()=>{setFAno([]);setFMes([]);setFVend([])}}>✕ Limpar</button>
        <button style={{ marginLeft:'auto',padding:'6px 16px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontSize:12,fontWeight:600,cursor:'pointer' }} onClick={exportar}>⬇ Exportar Excel</button>
      </div>

      <RealceBanner sel={sel} onClear={() => setSel(null)} />

      <div style={st.kpiBar}>
        <div style={st.kpi}><div style={st.kpiVal}>{loading?'...':fmtN(dados?.kpis?.qtde)}</div><div style={st.kpiLbl}>Total Produtos</div></div>
        <div style={{ ...st.kpi,borderRight:'none' }}><div style={st.kpiVal}>{loading?'...':fmtVal(dados?.kpis?.valor)}</div><div style={st.kpiLbl}>Valor Total</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{loading?'...':fmtN(dados?.kpis?.clientes)}</div><div style={st.kpiLbl}>Qtd. Clientes</div></div>
      </div>

      {loading?<div style={{ padding:40,textAlign:'center',color:'#6b7a99' }}>Carregando dados...</div>:(
        <div style={st.page}>
          {/* REPRESENTATIVIDADE 50% + O QUE O CLIENTE COMPROU */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start' }}>
            {/* 50% do faturamento */}
            <div style={st.card}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                <span style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>Clientes que representam 50% do faturamento</span>
                <span style={{ padding:'3px 10px',borderRadius:20,background:'#dbeafe',color:'#1341c4',fontSize:11,fontWeight:700 }}>{dados?.cli50?.length} clientes</span>
              </div>
              <div style={{ width:'100%',height:8,background:'#f4f6fb',borderRadius:4,marginBottom:12,overflow:'hidden' }}>
                <div style={{ width:(dados?.cli50?.[dados.cli50.length-1]?.acumulado||0)+'%',height:'100%',background:'#1341c4',borderRadius:4 }}/>
              </div>
              <div style={{ fontSize:11,color:'#9aa6bf',marginBottom:8 }}>Clique num cliente para ver o que ele comprou →</div>
              <div style={{ maxHeight:320,overflowY:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr><th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th><th style={{ ...st.th,textAlign:'right' }}>%</th><th style={{ ...st.th,textAlign:'right' }}>Acum.</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
                  <tbody>{dados?.cli50?.map((c,i)=>(
                    <tr key={i} onClick={()=>pick('cliente',c.cliente)} style={{ cursor:'pointer',background:cliCompra===c.cliente?'#e8f7ee':(isSel('cliente',c.cliente)?'#e8eeff':'') }}>
                      <td style={st.td}><span style={{ display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700 }}>{i+1}</span></td>
                      <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{c.cliente}{cliCompra===c.cliente&&<span style={{ marginLeft:6,fontSize:9,fontWeight:800,color:'#15803d',background:'#dcfce7',padding:'1px 6px',borderRadius:10 }}>🖱️</span>}</td>
                      <td style={st.td}><span style={{ padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'#e8eeff',color:'#1341c4' }}>{c.uf}</span></td>
                      <td style={{ ...st.td,textAlign:'right' }}>{c.pct}%</td>
                      <td style={{ ...st.td,textAlign:'right',fontWeight:700,color:'#1341c4' }}>{c.acumulado}%</td>
                      <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(c.valor)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            {/* O que o cliente comprou no período */}
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:10 }}>O que o cliente comprou no período</div>
              {cliCompra ? (
                <>
                  <div style={{ fontSize:12,fontWeight:700,color:'#0f1729',marginBottom:2 }}>{cliCompra}</div>
                  <div style={{ fontSize:11,color:'#6b7a99',marginBottom:12 }}>{comprasCliente.length} produtos · {fmtVal(totalCompra)} no total</div>
                  <div style={{ maxHeight:320,overflowY:'auto' }}>
                    <table style={{ width:'100%',borderCollapse:'collapse' }}>
                      <thead><tr><th style={st.th}>#</th><th style={st.th}>Produto</th><th style={{ ...st.th,textAlign:'right' }}>QTDE</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
                      <tbody>
                        {comprasCliente.length===0&&<tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={4}>Sem compras no período.</td></tr>}
                        {comprasCliente.map((p,i)=>(
                          <tr key={i}>
                            <td style={st.td}><span style={{ display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700 }}>{i+1}</span></td>
                            <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{p.produto}</td>
                            <td style={{ ...st.td,textAlign:'right' }}>{fmtN(p.qtde)}</td>
                            <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(p.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div style={{ padding:20,textAlign:'center',color:'#9aa6bf',fontSize:12 }}>Clique num cliente ao lado.</div>}
            </div>
          </div>

          {/* % CLIENTE POR MÊS */}
          <div style={st.card}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
              <span style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>Participação % do cliente por mês</span>
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:14 }}>
              {dados?.top5Cli?.map(c=>(
                <button key={c} onClick={()=>setCliAtivo(c)} style={{ padding:'4px 10px',borderRadius:20,border:`1.5px solid ${cliAtivo===c?'#1341c4':'#e2e6f0'}`,background:cliAtivo===c?'#1341c4':'white',color:cliAtivo===c?'white':'#6b7a99',fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' }}>
                  {c.length>30?c.slice(0,30)+'…':c}
                </button>
              ))}
            </div>
            <div style={{ height:220 }}>
              {cliMesData && <Line data={{ labels:mesesLabel, datasets:[{ label:'% no mês',data:cliMesData.map(d=>d.pct),borderColor:'#1341c4',backgroundColor:'rgba(19,65,196,0.08)',borderWidth:2.5,pointRadius:4,fill:true,tension:0.4 }] }} options={{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#f0f2f8'},ticks:{callback:v=>v+'%',font:{size:10}},min:0}} }} />}
            </div>
          </div>

          {/* RANKING + UF */}
          <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:16 }}>
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:14 }}>Ranking completo de clientes {sel && <span style={{ fontWeight:500,textTransform:'none',color:'#ea8c00' }}>· filtrado por {sel.value}</span>}</div>
              <div style={{ maxHeight:300,overflowY:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr><th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th><th style={{ ...st.th,textAlign:'right' }}>QTDE</th><th style={{ ...st.th,textAlign:'right' }}>%</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
                  <tbody>
                    {ranking.length===0 && <tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={6}>Nenhum cliente para este realce.</td></tr>}
                    {ranking.map((c,i)=>(
                    <tr key={i} onClick={()=>pick('cliente',c.cliente)} style={{ cursor:'pointer',background:isSel('cliente',c.cliente)?'#e8eeff':'' }}>
                      <td style={st.td}><span style={{ display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700 }}>{i+1}</span></td>
                      <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{c.cliente}</td>
                      <td style={st.td}><span style={{ padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'#e8eeff',color:'#1341c4' }}>{c.uf}</span></td>
                      <td style={{ ...st.td,textAlign:'right' }}>{fmtN(c.qtd)}</td>
                      <td style={{ ...st.td,textAlign:'right' }}>{c.pct}%</td>
                      <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(c.valor)}</td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:14 }}>Participação por estado <span style={{ fontWeight:500,textTransform:'none',color:'#9aa6bf' }}>· clique p/ realçar</span></div>
              <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                <div style={{ width:130,height:130 }}>
                  <Doughnut data={dough} options={doughOpts} />
                </div>
                <div style={{ flex:1 }}>
                  {dados?.ufTotal?.map((u,i)=>(
                    <div key={i} onClick={()=>pick('uf',u.uf)} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer',opacity:contribui(linhas,'uf',u.uf,sel)?1:0.4 }}>
                      <div style={{ width:10,height:10,borderRadius:2,background:COR_UFS[u.uf]||'#9ca3af' }}/>
                      <span style={{ fontSize:12,fontWeight:isSel('uf',u.uf)?800:600,flex:1 }}>{u.uf}</span>
                      <span style={{ fontSize:11,color:'#6b7a99' }}>{u.clientes} cli.</span>
                      <span style={{ fontSize:12,fontWeight:700,color:'#1341c4' }}>{u.pct}%</span>
                    </div>
                  ))}
                </div>
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
  if (!user.paginas?.includes('cliente')) return { redirect: { destination: '/dashboard/'+(user.paginas?.[0]||''), permanent: false } }
  return { props: { user } }
}
