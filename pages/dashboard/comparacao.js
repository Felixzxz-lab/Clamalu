import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js'
import { RealceBanner } from '../../components/realce'
import { MultiSelect, VEND_OPC } from '../../components/MultiSelect'
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
  const [fVend, setFVend] = useState([])
  const [sel, setSel] = useState(null) // realce de série: { dim:'ano'|'vendedor', value }
  const [cliComp, setCliComp] = useState(null) // cliente selecionado no comparativo por cliente

  useEffect(() => { carregar() }, [anos, mesesSel, fVend])

  // série "apagada"? (há realce, é da mesma dimensão, mas não é a selecionada)
  const off = (dim, val) => sel && sel.dim === dim && sel.value !== val
  function pick(dim, value) {
    if (value == null) return
    setSel(s => (s && s.dim === dim && String(s.value) === String(value)) ? null : { dim, value })
  }

  async function carregar() {
    if (!anos.length) return
    setLoading(true)
    const p = new URLSearchParams()
    p.set('anos', anos.join(','))
    if (mesesSel.length) p.set('meses', mesesSel.join(','))
    if (fVend.length) p.set('vendedor', fVend.join(','))
    const r = await fetch('/api/dados/comparacao?' + p)
    if (r.status === 401) { router.push('/'); return }
    setDados(await r.json())
    setSel(null)
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

  // ---- Comparativos por produto e por cliente (mês a mês), a partir das linhas ----
  const linhasC = dados?.linhas || []
  const aBase = anos[0], aComp = anos[anos.length-1]
  const doComp = anos.length >= 2 && aBase !== aComp
  const perLabel = mesesSel.length===1 ? MESES[mesesSel[0]-1] : (mesesSel.length ? mesesSel.map(m=>MESES[m-1]).join(', ') : 'Ano (todos os meses)')
  const varCell = v => v===null||v===undefined ? <span style={{ color:'#9ca3af' }}>—</span> : <span style={{ color:v>=0?'#16a34a':'#dc2626',fontWeight:700,whiteSpace:'nowrap' }}>{v>=0?'▲':'▼'} {Math.abs(v).toFixed(1)}%</span>
  function aggComp(key){
    const m={}
    for(const r of linhasC){ const o=m[r[key]]=m[r[key]]||{uf:r.uf,v0:0,v1:0}; if(r.ano===aBase)o.v0+=r.valor_total; else if(r.ano===aComp)o.v1+=r.valor_total }
    return Object.entries(m).map(([k,d])=>({ chave:k, uf:d.uf, v0:Math.round(d.v0*100)/100, v1:Math.round(d.v1*100)/100, varV:d.v0>0&&d.v1>0?(d.v1-d.v0)/d.v0*100:null }))
  }
  const porProduto = doComp ? aggComp('produto').sort((a,b)=>b.v0-a.v0) : []
  const porCliente = doComp ? aggComp('cliente').sort((a,b)=>b.v0-a.v0) : []
  const produtosQueCairam = doComp ? porProduto.filter(p=>p.v0>0).map(p=>({ ...p, diff:Math.round((p.v1-p.v0)*100)/100 })).sort((a,b)=>a.diff-b.diff).slice(0,10) : []
  const cliCompSel = (cliComp && porCliente.some(c=>c.chave===cliComp)) ? cliComp : (porCliente[0]?.chave || null)
  const produtosDoCliente = (() => {
    if(!cliCompSel) return []
    const m={}
    for(const r of linhasC){ if(r.cliente!==cliCompSel) continue; const o=m[r.produto]=m[r.produto]||{v0:0,v1:0,q0:0,q1:0}; if(r.ano===aBase){o.v0+=r.valor_total;o.q0+=r.qtde} else if(r.ano===aComp){o.v1+=r.valor_total;o.q1+=r.qtde} }
    return Object.entries(m).map(([k,d])=>({ produto:k, v0:d.v0, v1:d.v1, q0:d.q0, q1:d.q1, varV:d.v0>0&&d.v1>0?(d.v1-d.v0)/d.v0*100:null })).sort((a,b)=>b.v0-a.v0).slice(0,12)
  })()

  // Radar: pares cliente x produto que existiam no ano base e ZERARAM no ano comparado
  const zerados = doComp ? (() => {
    const m={}
    for(const r of linhasC){
      const k=r.cliente+'||'+r.produto
      const o=m[k]=m[k]||{ cliente:r.cliente, produto:r.produto, uf:r.uf, v0:0, v1:0, q0:0 }
      if(r.ano===aBase){ o.v0+=r.valor_total; o.q0+=r.qtde } else if(r.ano===aComp){ o.v1+=r.valor_total }
    }
    return Object.values(m).filter(o=>o.v0>0 && o.v1===0).sort((a,b)=>b.v0-a.v0)
  })() : []
  const zeradosTop = zerados.slice(0,25)
  const zeradosTotal = zerados.reduce((s,z)=>s+z.v0,0)
  const zeradosClientes = new Set(zerados.map(z=>z.cliente)).size

  return (
    <div style={{ minHeight:'100vh',background:'#f4f6fb',fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:13 }}>
      <Head><title>Clamalu · Comparação</title></Head>
      <div style={st.header}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0b2a8a' }}>CL</div>
          <div><div style={{ color:'white',fontSize:16,fontWeight:700 }}>Clamalu</div><div style={{ color:'rgba(255,255,255,0.5)',fontSize:11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {['vendedor','produto','cliente','comparacao','financeiro'].filter(p=>user?.paginas?.includes(p)).map(p=>(
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
          <MultiSelect options={user?.vendedores?.length ? user.vendedores : VEND_OPC} value={fVend} onChange={setFVend} minWidth={130} />
        </div>
        <div style={{ display:'flex',alignItems:'flex-end',gap:8,marginLeft:'auto' }}>
          <button onClick={()=>{setAnos([2025,2026]);setMesesSel([]);setFVend([])}} style={{ padding:'7px 14px',borderRadius:8,border:'1.5px solid #e2e6f0',background:'white',color:'#6b7a99',fontSize:12,fontWeight:500,cursor:'pointer' }}>✕ Resetar</button>
          <button onClick={exportar} style={{ padding:'7px 16px',borderRadius:8,border:'none',background:'#16a34a',color:'white',fontSize:12,fontWeight:600,cursor:'pointer' }}>⬇ Exportar Excel</button>
        </div>
      </div>

      <RealceBanner sel={sel} onClear={() => setSel(null)} />

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
              <Line data={{ labels, datasets: anos.map(a=>({ label:''+a, data:mesesAtivos.map(m=>dados?.mensal?.[a]?.[m]?.valor||null), borderColor:off('ano',a)?CORES_ANO[a]+'22':CORES_ANO[a], backgroundColor:off('ano',a)?'transparent':CORES_ANO[a]+'18', borderWidth:2.5, pointRadius:4, fill:anos.indexOf(a)===0, tension:0.4, spanGaps:true, borderDash:a===2024?[5,4]:[] })) }} options={{ responsive:true,maintainAspectRatio:false,onClick:(e,els)=>{if(els.length)pick('ano',anos[els[0].datasetIndex])},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmtVal(ctx.raw||0)}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'#f0f2f8'},ticks:{callback:v=>fmtVal(v),font:{size:10}}}} }} />
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            {/* QTDE */}
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:12 }}>Quantidade mensal</div>
              <div style={{ height:220 }}>
                <Bar data={{ labels, datasets: anos.map(a=>({ label:''+a, data:mesesAtivos.map(m=>dados?.mensal?.[a]?.[m]?.qtde||null), backgroundColor:off('ano',a)?CORES_ANO[a]+'18':CORES_ANO[a]+'bb', borderRadius:4, borderSkipped:false })) }} options={{ responsive:true,maintainAspectRatio:false,onClick:(e,els)=>{if(els.length)pick('ano',anos[els[0].datasetIndex])},interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:12,padding:10}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#f0f2f8'},ticks:{font:{size:10}}}} }} />
              </div>
            </div>
            {/* VENDEDOR */}
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:12 }}>Valor por vendedor — {anos[anos.length-1]}</div>
              <div style={{ height:220 }}>
                <Line data={{ labels, datasets: Object.keys(CORES_VEND).filter(v=>dados?.vendMes?.[v]).map(v=>({ label:v, data:mesesAtivos.map(m=>dados?.vendMes?.[v]?.[anos[anos.length-1]]?.[m]||null), borderColor:off('vendedor',v)?CORES_VEND[v]+'2e':CORES_VEND[v], backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.4, spanGaps:true })) }} options={{ responsive:true,maintainAspectRatio:false,onClick:(e,els)=>{if(els.length)pick('vendedor',Object.keys(CORES_VEND).filter(v=>dados?.vendMes?.[v])[els[0].datasetIndex])},interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:12,padding:8}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#f0f2f8'},ticks:{callback:v=>fmtVal(v),font:{size:10}}}} }} />
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

          {/* TOP PRODUTOS QUE CAÍRAM */}
          {doComp && (
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:4 }}>Top 10 produtos que mais caíram — {aBase} → {aComp}</div>
              <div style={{ fontSize:11,color:'#9aa6bf',marginBottom:14 }}>Período: <strong>{perLabel}</strong> · selecione um único mês nos filtros acima para ver mês a mês.</div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr><th style={{ ...st.th,textAlign:'left' }}>#</th><th style={{ ...st.th,textAlign:'left' }}>Produto</th><th style={st.th}>{aBase}</th><th style={st.th}>{aComp}</th><th style={st.th}>Queda</th><th style={st.th}>Var. %</th></tr></thead>
                <tbody>
                  {produtosQueCairam.length===0 && <tr><td style={{ ...st.td,textAlign:'left',color:'#9aa6bf' }} colSpan={6}>Sem dados para o filtro atual.</td></tr>}
                  {produtosQueCairam.map((p,i)=>(
                    <tr key={i}>
                      <td style={{ ...st.td,textAlign:'left' }}>{i+1}</td>
                      <td style={{ ...st.td,textAlign:'left',fontWeight:600,fontSize:11 }}>{p.chave}</td>
                      <td style={st.td}>{fmtVal(p.v0)}</td><td style={st.td}>{fmtVal(p.v1)}</td>
                      <td style={{ ...st.td,color:'#dc2626',fontWeight:700 }}>{fmtVal(p.diff)}</td>
                      <td style={st.td}>{varCell(p.varV)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* COMPARATIVO POR PRODUTO */}
          {doComp && (
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:14 }}>Comparativo por produto — {aBase} vs {aComp} <span style={{ fontWeight:500,textTransform:'none',color:'#9aa6bf' }}>· {perLabel}</span></div>
              <div style={{ maxHeight:340,overflowY:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr><th style={{ ...st.th,textAlign:'left' }}>#</th><th style={{ ...st.th,textAlign:'left' }}>Produto</th><th style={st.th}>{aBase}</th><th style={st.th}>{aComp}</th><th style={st.th}>Var. %</th></tr></thead>
                  <tbody>{porProduto.slice(0,30).map((p,i)=>(
                    <tr key={i}>
                      <td style={{ ...st.td,textAlign:'left' }}>{i+1}</td>
                      <td style={{ ...st.td,textAlign:'left',fontWeight:600,fontSize:11 }}>{p.chave}</td>
                      <td style={st.td}>{fmtVal(p.v0)}</td><td style={st.td}>{fmtVal(p.v1)}</td><td style={st.td}>{varCell(p.varV)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMPARATIVO POR CLIENTE + DRILL */}
          {doComp && (
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1.15fr',gap:16,alignItems:'start' }}>
              <div style={st.card}>
                <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:4 }}>Comparativo por cliente — {aBase} vs {aComp} <span style={{ fontWeight:500,textTransform:'none',color:'#9aa6bf' }}>· {perLabel}</span></div>
                <div style={{ fontSize:11,color:'#9aa6bf',marginBottom:12 }}>Clique num cliente para ver onde o consumo dele caiu →</div>
                <div style={{ maxHeight:340,overflowY:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr><th style={{ ...st.th,textAlign:'left' }}>#</th><th style={{ ...st.th,textAlign:'left' }}>Cliente</th><th style={st.th}>UF</th><th style={st.th}>{aBase}</th><th style={st.th}>{aComp}</th><th style={st.th}>Var.</th></tr></thead>
                    <tbody>{porCliente.slice(0,40).map((c,i)=>(
                      <tr key={i} onClick={()=>setCliComp(c.chave)} style={{ cursor:'pointer',background:cliCompSel===c.chave?'#e8f7ee':'' }}>
                        <td style={{ ...st.td,textAlign:'left' }}>{i+1}</td>
                        <td style={{ ...st.td,textAlign:'left',fontWeight:600,fontSize:11 }}>{c.chave}</td>
                        <td style={st.td}><span style={{ padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'#e8eeff',color:'#1341c4' }}>{c.uf}</span></td>
                        <td style={st.td}>{fmtVal(c.v0)}</td><td style={st.td}>{fmtVal(c.v1)}</td><td style={st.td}>{varCell(c.varV)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              <div style={st.card}>
                <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:4 }}>Onde o consumo caiu</div>
                <div style={{ fontSize:12,fontWeight:700,color:'#0f1729',marginBottom:12 }}>{cliCompSel||'—'}</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={{ ...st.th,textAlign:'left' }}>Produto</th>
                    <th style={st.th}>Qtd {aBase}</th><th style={st.th}>Qtd {aComp}</th>
                    <th style={st.th}>{aBase}</th><th style={st.th}>{aComp}</th>
                    <th style={st.th}>Var.</th>
                  </tr></thead>
                  <tbody>
                    {produtosDoCliente.length===0 && <tr><td style={{ ...st.td,textAlign:'left',color:'#9aa6bf' }} colSpan={6}>Clique num cliente.</td></tr>}
                    {produtosDoCliente.map((p,i)=>(
                      <tr key={i}>
                        <td style={{ ...st.td,textAlign:'left',fontWeight:600,fontSize:11 }}>{p.produto}</td>
                        <td style={st.td}>{fmtN(p.q0)}</td>
                        <td style={{ ...st.td, fontWeight: p.q1!==p.q0?700:400, color: p.q1<p.q0?'#dc2626':p.q1>p.q0?'#16a34a':'#0f1729' }}>{fmtN(p.q1)}</td>
                        <td style={st.td}>{fmtVal(p.v0)}</td><td style={st.td}>{fmtVal(p.v1)}</td><td style={st.td}>{varCell(p.varV)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RADAR: CLIENTES QUE PARARAM DE COMPRAR PRODUTOS */}
          {doComp && (
            <div style={st.card}>
              <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',marginBottom:4 }}>🚨 Produtos que o cliente parou de comprar — {aBase} → {aComp} <span style={{ fontWeight:500,textTransform:'none',color:'#9aa6bf' }}>· {perLabel}</span></div>
              <div style={{ fontSize:11,color:'#9aa6bf',marginBottom:10 }}>
                Comprou em <b>{aBase}</b> e não comprou <b>nada</b> em {aComp}. Ordenado pelo valor perdido.
                <span style={{ color:'#b45309' }}> ⚠️ Compare períodos equivalentes — selecione nos filtros acima só os meses que já existem nos dois anos, senão meses ainda não lançados aparecem como "parou de comprar".</span>
              </div>
              {zerados.length===0 ? (
                <div style={{ padding:16,textAlign:'center',color:'#16a34a',fontSize:12,fontWeight:600 }}>✅ Nenhum produto foi zerado no período — nenhum cliente parou de comprar.</div>
              ) : (<>
                <div style={{ display:'flex',gap:24,marginBottom:12,flexWrap:'wrap' }}>
                  <div><div style={{ fontSize:10,color:'#6b7a99',fontWeight:700,textTransform:'uppercase' }}>Valor perdido</div><div style={{ fontSize:20,fontWeight:800,color:'#dc2626' }}>{fmtVal(zeradosTotal)}</div></div>
                  <div><div style={{ fontSize:10,color:'#6b7a99',fontWeight:700,textTransform:'uppercase' }}>Clientes afetados</div><div style={{ fontSize:20,fontWeight:800,color:'#0f1729' }}>{zeradosClientes}</div></div>
                  <div><div style={{ fontSize:10,color:'#6b7a99',fontWeight:700,textTransform:'uppercase' }}>Itens zerados</div><div style={{ fontSize:20,fontWeight:800,color:'#0f1729' }}>{zerados.length}</div></div>
                </div>
                <div style={{ maxHeight:340,overflowY:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse' }}>
                    <thead><tr>
                      <th style={{ ...st.th,textAlign:'left' }}>#</th><th style={{ ...st.th,textAlign:'left' }}>Cliente</th><th style={st.th}>UF</th>
                      <th style={{ ...st.th,textAlign:'left' }}>Produto</th>
                      <th style={st.th}>Qtd {aBase}</th><th style={st.th}>Valor perdido</th>
                    </tr></thead>
                    <tbody>{zeradosTop.map((z,i)=>(
                      <tr key={i} onClick={()=>setCliComp(z.cliente)} style={{ cursor:'pointer' }}>
                        <td style={{ ...st.td,textAlign:'left' }}>{i+1}</td>
                        <td style={{ ...st.td,textAlign:'left',fontWeight:600,fontSize:11 }}>{z.cliente}</td>
                        <td style={st.td}><span style={{ padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'#e8eeff',color:'#1341c4' }}>{z.uf}</span></td>
                        <td style={{ ...st.td,textAlign:'left',fontSize:11 }}>{z.produto}</td>
                        <td style={st.td}>{fmtN(z.q0)}</td>
                        <td style={{ ...st.td,fontWeight:700,color:'#dc2626' }}>{fmtVal(z.v0)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {zerados.length>25 && <div style={{ fontSize:11,color:'#9aa6bf',marginTop:8 }}>Mostrando os 25 maiores de {zerados.length}. Clique numa linha para ver o cliente no comparativo acima.</div>}
              </>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps({ req }) {
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (!user) return { redirect: { destination: '/', permanent: false } }
  if (!user.paginas?.includes('comparacao')) return { redirect: { destination: '/dashboard/'+(user.paginas?.[0]||''), permanent: false } }
  return { props: { user } }
}
