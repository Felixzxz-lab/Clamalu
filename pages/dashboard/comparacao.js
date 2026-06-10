import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

const CORES_ANO = { 2024:'#93aafc', 2025:'#1341c4', 2026:'#16a34a' }
const CORES_VEND = { THIAGO:'#1341c4', WENDEL:'#16a34a', CLEBER:'#dc2626', CLAMALU:'#ea8c00' }
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtVal(v){if(!v||v===0)return'—';if(v>=1e6)return'R$ '+(v/1e6).toFixed(2).replace('.',',')+' Mi';if(v>=1e3)return'R$ '+(v/1e3).toFixed(0)+' Mil';return'R$ '+Math.round(v)}
function fmtN(v){if(!v)return'—';return Number(Math.round(v)).toLocaleString('pt-BR')}
function delta(a,b){if(!a||!b)return null;return((b-a)/a*100)}

export default function Comparacao({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [anos, setAnos] = useState([2025, 2026])
  const [mesesSel, setMesesSel] = useState([])
  const [fVend, setFVend] = useState('')

  useEffect(() => { carregar() }, [anos, mesesSel, fVend])

  async function carregar() {
    if (!anos.length) return
    setLoading(true)
    const p = new URLSearchParams()
    p.set('anos', anos.join(','))
    if (mesesSel.length) p.set('meses', mesesSel.join(','))
    if (fVend) p.set('vendedor', fVend)
    const r = await fetch('/api/dados/comparacao?' + p)
    if (r.status === 401) { router.push('/'); return }
    setDados(await r.json())
    setLoading(false)
  }

  function toggleAno(a) { setAnos(prev => prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a].sort()) }
  function toggleMes(m) { setMesesSel(prev => prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m].sort()) }

  const mesesAtivos = mesesSel.length ? mesesSel : [1,2,3,4,5,6,7,8,9,10,11,12]
  const labels = mesesAtivos.map(m => MESES[m-1])

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const rows = [['Mês', ...anos.flatMap(a => ['Valor '+a, 'QTDE '+a])]]
    mesesAtivos.forEach(m => {
      rows.push([MESES[m-1], ...anos.flatMap(a => [dados?.mensal?.[a]?.[m]?.valor||0, dados?.mensal?.[a]?.[m]?.qtde||0])])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Comparativo')
    XLSX.writeFile(wb, 'Clamalu_Comparacao.xlsx')
  }

  const st = {
    header:{background:'#0b2a8a',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',height:58,position:'sticky',top:0,zIndex:100},
    filtros:{background:'white',borderBottom:'1px solid #e2e6f0',padding:'14px 28px',display:'flex',alignItems:'flex-start',gap:24,flexWrap:'wrap'},
    label:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',display:'block',marginBottom:6},
    kpiBar:{background:'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)',padding:'16px 28px',display:'flex',flexWrap:'wrap'},
    kpi:{textAlign:'center',padding:'8px 24px',borderRight:'1px solid rgba(255,255,255,0.12)',flex:1,minWidth:120},
    kpiVal:{fontSize:28,fontWeight:800,color:'white',letterSpacing:-0.5,lineHeight:1},
    kpiLbl:{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.8px',marginTop:4},
    page:{padding:'20px 28px',display:'flex',flexDirection:'column',gap:16},
    card:{background:'white',borderRadius:12,boxShadow:'0 2px 8px rgba(19,65,196,0.08)',border:'1px solid #e2e6f0',padding:'18px 20px'},
    th:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.7px',color:'#6b7a99',padding:'0 8px 10px',borderBottom:'2px solid #e2e6f0',textAlign:'right'},
    td:{padding:'7px 8px',borderBottom:'1px solid #f3f4f6',fontSize:12,color:'#0f1729',textAlign:'right'},
  }

  return (
    <div style={{ minHeight:'100vh',background:'#f4f6fb',fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:13 }}>
      <Head><title>Clamalu · Comparação</title></Head>
      <div style={st.header}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0b2a8a' }}>CL</div>
          <div><div style={{ color:'white',fontSize:16,fontWeight:700 }}>Clamalu</div><div style={{ color:'rgba(255,255,255,0.5)',fontSize:11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {['vendedor','produto','cliente','comparacao'].filter(p=>user?.paginas?.includes(p)).map(p=>(
            <button key={p} onClick={()=>router.push('/dashboard/'+p)} style={{ padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'uppercase',background:p==='comparacao'?'white':'rgba(255,255,255,0.1)',color:p==='comparacao'?'#0b2a8a':'rgba(255,255,255,0.75)' }}>
              {p==='comparacao'?'Comparação':p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
          {user?.role==='admin'&&<button onClick={()=>router.push('/admin')} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(255,255,255,0.15)',color:'white',marginLeft:8 }}>⚙ Admin</button>}
          <button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.push('/')}} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(220,38,38,0.7)',color:'white',marginLeft:4 }}>Sair</button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={st.filtros}>
        <div>
          <span style={st.label}>Anos para comparar</span>
          <div style={{ display:'flex',gap:10 }}>
            {[2024,2025,2026].map(a=>(
              <label key={a} style={{ display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,cursor:'pointer' }}>
                <input type="checkbox" checked={anos.includes(a)} onChange={()=>toggleAno(a)} style={{ width:15,height:15,accentColor:CORES_ANO[a] }} />
                <span style={{ color:CORES_ANO[a] }}>{a}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <span style={st.label}>Meses (todos se nenhum selecionado)</span>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
            {MESES.map((m,i)=>(
              <button key={i} onClick={()=>toggleMes(i+1)} style={{ padding:'4px 10px',borderRadius:6,border:`1.5px solid ${mesesSel.includes(i+1)?'#1341c4':'#e2e6f0'}`,background:mesesSel.includes(i+1)?'#1341c4':'white',color:mesesSel.includes(i+1)?'white':'#6b7a99',fontSize:11,fontWeight:600,cursor:'pointer' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span style={st.label}>Vendedor</span>
          <select style={{ border:'1.5px solid #e2e6f0',borderRadius:8,padding:'6px 12px',fontSize:12,background:'#f4f6fb',cursor:'pointer',outline:'none' }} value={fVend} onChange={e=>setFVend(e.target.value)}>
            <option value="">Todos</option><option>THIAGO</option><option>WENDEL</option><option>CLEBER</option><option>CLAMALU</option>
          </select>
        </div>
        <div style={{ display:'flex',alignItems:'flex-end',gap:8,marginLeft:'auto' }}>
          <button onClick={()=>{setAnos([2025,2026]);setMesesSel([]);setFVend('')}} style={{ padding:'7px 14px',borderRadius:8,border:'1.5px solid #e2e6f0',background:'white',color:'#6b7a99',fontSize:12,fontWeight:500,cursor:'pointer' }}>✕ Resetar</button>
          <button onClick={exportar} style={{ padding:'7px 16px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontSize:12,fontWeight:600,cursor:'pointer' }}>⬇ Exportar Excel</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={st.kpiBar}>
        {anos.map(a=>(
          <div key={a} style={st.kpi}>
            <div style={{ ...st.kpiVal,color:CORES_ANO[a] }}>{loading?'...':fmtVal(dados?.totaisPorAno?.[a]?.valor||0)}</div>
            <div style={st.kpiLbl}>Total {a}</div>
            <div style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.6)',marginTop:3 }}>{loading?'':fmtN(dados?.totaisPorAno?.[a]?.qtde||0)} un.</div>
          </div>
        ))}
        {anos.length===2&&dados&&(()=>{
          const v0=dados.totaisPorAno?.[anos[0]]?.valor||0
          const v1=dados.totaisPorAno?.[anos[1]]?.valor||0
          const d=delta(v0,v1)
          if(d===null)return null
          return <div style={st.kpi}><div style={{ ...st.kpiVal,color:d>=0?'#4ade80':'#f87171' }}>{d>=0?'▲':'▼'} {Math.abs(d).toFixed(1)}%</div><div style={st.kpiLbl}>{anos[0]}→{anos[1]}</div></div>
        })()}
      </div>

      {loading?<div style={{ padding:40,textAlign:'center',color:'#6b7a99' }}>Carregando dados...</div>:(
        <div style={st.page}>
          {/* GRÁFICO PRINCIPAL */}
          <div style={st.card}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
              <span style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>Valor total mensal — comparativo</span>
              <div style={{ display:'flex',gap:12 }}>
                {anos.map(a=><div key={a} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#6b7a99' }}><div style={{ width:22,height:3,background:CORES_ANO[a],borderRadius:2 }}/>{a}</div>)}
              </div>
            </div>
            <div style={{ height:260 }}>
              <Line data={{ labels, datasets: anos.map(a=>({ label:''+a, data:mesesAtivos.map(m=>dados?.mensal?.[a]?.[m]?.valor||null), borderColor:CORES_ANO[a], backgroundColor:CORES_ANO[a]+'18', borderWidth:2.5, pointRadius:4, fill:anos.indexOf(a)===0, tension:0.4, spanGaps:true, borderDash:a===2024?[5,4]:[] })) }} options={{ responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmtVal(ctx.raw||0)}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#f0f2f8'},ticks:{callback:v=>fmtVal(v),font:{size:10}}}} }} />
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            {/* QTDE */}
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:12 }}>Quantidade mensal</div>
              <div style={{ height:220 }}>
                <Bar data={{ labels, datasets: anos.map(a=>({ label:''+a, data:mesesAtivos.map(m=>dados?.mensal?.[a]?.[m]?.qtde||null), backgroundColor:CORES_ANO[a]+'bb', borderRadius:4, borderSkipped:false })) }} options={{ responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:12,padding:10}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#f0f2f8'},ticks:{font:{size:10}}}} }} />
              </div>
            </div>
            {/* VENDEDOR */}
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:12 }}>Valor por vendedor — {anos[anos.length-1]}</div>
              <div style={{ height:220 }}>
                <Line data={{ labels, datasets: Object.keys(CORES_VEND).filter(v=>dados?.vendMes?.[v]).map(v=>({ label:v, data:mesesAtivos.map(m=>dados?.vendMes?.[v]?.[anos[anos.length-1]]?.[m]||null), borderColor:CORES_VEND[v], backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.4, spanGaps:true })) }} options={{ responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:12,padding:8}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#f0f2f8'},ticks:{callback:v=>fmtVal(v),font:{size:10}}}} }} />
              </div>
            </div>
          </div>

          {/* TABELA */}
          {anos.length>=2&&(
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:14 }}>Tabela comparativa — {anos[0]} vs {anos[anos.length-1]}</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={{ ...st.th,textAlign:'left' }}>Mês</th>
                    <th style={st.th}>Valor {anos[0]}</th><th style={st.th}>Valor {anos[anos.length-1]}</th><th style={st.th}>Var. %</th>
                    <th style={st.th}>QTDE {anos[0]}</th><th style={st.th}>QTDE {anos[anos.length-1]}</th><th style={st.th}>Var. %</th>
                  </tr></thead>
                  <tbody>{mesesAtivos.map(m=>{
                    const v0=dados?.mensal?.[anos[0]]?.[m]?.valor||0
                    const v1=dados?.mensal?.[anos[anos.length-1]]?.[m]?.valor||0
                    const q0=dados?.mensal?.[anos[0]]?.[m]?.qtde||0
                    const q1=dados?.mensal?.[anos[anos.length-1]]?.[m]?.qtde||0
                    const dv=delta(v0,v1), dq=delta(q0,q1)
                    const fmtD=d=>d===null?<span style={{color:'#9ca3af'}}>—</span>:<span style={{color:d>=0?'#16a34a':'#dc2626',fontWeight:700}}>{d>=0?'▲':'▼'} {Math.abs(d).toFixed(1)}%</span>
                    return <tr key={m} onMouseEnter={e=>e.currentTarget.style.background='#f7f9ff'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{ ...st.td,textAlign:'left',fontWeight:600 }}>{MESES[m-1]}</td>
                      <td style={st.td}>{fmtVal(v0)}</td><td style={st.td}>{fmtVal(v1)}</td><td style={st.td}>{fmtD(dv)}</td>
                      <td style={st.td}>{fmtN(q0)}</td><td style={st.td}>{fmtN(q1)}</td><td style={st.td}>{fmtD(dq)}</td>
                    </tr>
                  })}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps({ req }) {
  const { parse } = await import('cookie')
  const { verifyToken } = await import('../../lib/auth')
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (!user) return { redirect: { destination: '/', permanent: false } }
  if (!user.paginas?.includes('comparacao')) return { redirect: { destination: '/dashboard/'+(user.paginas?.[0]||''), permanent: false } }
  return { props: { user } }
}
