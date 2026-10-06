import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { fade, aggBy, contribui, tabelaAgrupada } from '../../lib/realce'
import { RealceBanner } from '../../components/RealceBanner'
import { MultiSelect, MESES_OPC, useOpcoes } from '../../components/MultiSelect'
import { SEGMENTOS, segmentoDe } from '../../lib/segmentos'
import { recortes, somaPor } from '../../lib/periodo'
import { ParticipacaoUf, COR_UFS } from '../../components/ParticipacaoUf'
import { PAGINA_IDS, nomePagina, podeApresentar } from '../../lib/paginas'
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const AZUIS = ['#1341c4','#2a5ae0','#4a78f5','#7399f8','#93aafc','#b5c5fd']
function fmtVal(v){if(!v)return'—';if(v>=1e6)return'R$ '+(v/1e6).toFixed(2).replace('.',',')+' Mi';if(v>=1e3)return'R$ '+(v/1e3).toFixed(0)+' Mil';return'R$ '+Math.round(v)}
function fmtN(v){return Number(Math.round(v||0)).toLocaleString('pt-BR')}
function fmtEur(v){return v==null?'—':'€ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function difPct(p){const d=(p.f30.media/p.f70.media-1)*100;return (d>=0?'+':'')+d.toFixed(1).replace('.',',')+'%'}

export default function Produto({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState([])
  const [fMes, setFMes] = useState([])
  const [fVend, setFVend] = useState([])
  const [fSeg, setFSeg] = useState('Todos') // filtro do bloco de região
  const [fSegEuro, setFSegEuro] = useState('Todos') // filtro do bloco de euro
  const [sel, setSel] = useState(null)
  const opcoes = useOpcoes()

  useEffect(() => { carregar() }, [fAno, fMes, fVend])

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
  }

  const linhas = dados?.linhas || []
  function pick(dim, value) {
    if (!value) return
    setSel(s => (s && s.dim === dim && s.value === value) ? null : { dim, value })
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
    const s4 = [['Produto','€ médio clientes 70%','QTDE 70%','Clientes 70%','€ médio demais','QTDE demais','Clientes demais']]
    ;(dados?.euro?.produtos||[]).forEach(p => s4.push([p.produto, p.f70?.media ?? '', p.f70?.qtde ?? '', p.f70?.clientes ?? '', p.f30?.media ?? '', p.f30?.qtde ?? '', p.f30?.clientes ?? '']))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4), 'Preço médio Euro')
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

  // % por região: todos os produtos, cada um numa barra 100% dividida por UF
  const ufsOrdem = (dados?.ufTotal || []).map(u => u.uf)
  const prodRegiao = (dados?.prodUf || []).filter(p => fSeg === 'Todos' || segmentoDe(p.produto) === fSeg)
  const pctFmt = v => String(v).replace('.', ',') + '%'

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

  // preço médio em euro: clientes 70% x 30% (lib/euro.js). Azul x laranja da
  // paleta Okabe-Ito (lib/cores.js) — distinguíveis também para daltônico.
  const euro = dados?.euro
  const prodEuro = (euro?.produtos || []).filter(p => fSegEuro === 'Todos' || segmentoDe(p.produto) === fSegEuro)
  const FAIXAS_EURO = [
    { k:'f70', cor:'#0072B2', nome:`Clientes 70% (${euro?.clientes70 || 0})` },
    { k:'f30', cor:'#E69F00', nome:`Demais clientes (${Math.max(0,(euro?.clientesTotal||0)-(euro?.clientes70||0))})` },
  ]
  const bEuro = {
    data: {
      labels: prodEuro.map(p => p.produto.length > 26 ? p.produto.slice(0,26)+'…' : p.produto),
      datasets: FAIXAS_EURO.map(f => ({ label:f.nome, backgroundColor:f.cor, borderRadius:3, barPercentage:0.9, categoryPercentage:0.75, data: prodEuro.map(p => p[f.k]?.media ?? null) })),
    },
    opts: {
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{
        title: it => prodEuro[it[0].dataIndex].produto,
        label: it => { const g = prodEuro[it.dataIndex][FAIXAS_EURO[it.datasetIndex].k]; return `${FAIXAS_EURO[it.datasetIndex].nome}: ${fmtEur(g.media)} · ${fmtN(g.qtde)} un. · ${g.clientes} cliente(s)` },
        afterBody: it => { const p = prodEuro[it[0].dataIndex]; return p.f70 && p.f30 ? `Demais pagam ${difPct(p)} que os clientes 70%` : '' },
      } } },
      scales:{ x:{ grid:{color:'#f0f2f8'}, ticks:{ callback:v => '€ '+v } }, y:{ grid:{display:false}, ticks:{ font:{size:10} } } }
    }
  }

  // participação por estado: mês fechado e acumulado do ano (lib/periodo.js)
  const per = recortes(linhas)
  const ufMes = somaPor(per.mes, 'uf'), ufAcum = somaPor(per.acum, 'uf')

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
          {PAGINA_IDS.filter(p=>user?.paginas?.includes(p)).map(p=>(
            <button key={p} onClick={()=>router.push('/dashboard/'+p)} style={{ padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'uppercase',background:p==='produto'?'white':'rgba(255,255,255,0.1)',color:p==='produto'?'#0b2a8a':'rgba(255,255,255,0.75)' }}>
              {nomePagina(p)}
            </button>
          ))}
          {podeApresentar(user) && <button onClick={() => router.push('/apresentacao')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#16a34a', color: 'white', marginLeft: 8 }}>▶ Apresentação</button>}
          {user?.role==='admin'&&<button onClick={()=>router.push('/admin')} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(255,255,255,0.15)',color:'white',marginLeft:8 }}>⚙ Admin</button>}
          <button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.push('/')}} style={{ padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:'rgba(220,38,38,0.7)',color:'white',marginLeft:4 }}>Sair</button>
        </div>
      </div>

      <div style={st.filtros}>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Ano</span>
          <MultiSelect options={opcoes.anos} value={fAno} onChange={setFAno} accent="#a3b4f5" minWidth={110} /></div>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Mês</span>
          <MultiSelect options={MESES_OPC} value={fMes} onChange={setFMes} accent="#f5a3a3" minWidth={120} /></div>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}><span style={st.label}>Vendedor</span>
          <MultiSelect options={opcoes.vendedores.filter(v => !(user?.vendedores_ocultos || []).includes(v))} value={fVend} onChange={setFVend} accent="#a3dbb4" minWidth={120} /></div>
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

          {/* PREÇO MÉDIO EM EURO: clientes 70% x demais */}
          <div style={st.card}>
            <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:6 }}>
              <span style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>Preço médio em euro por produto — clientes 70% x demais</span>
              <div style={{ display:'flex',gap:4,marginLeft:'auto' }}>
                {['Todos', ...SEGMENTOS].map(s => (
                  <button key={s} onClick={()=>setFSegEuro(s)} style={{ padding:'4px 12px',borderRadius:20,border:`1.5px solid ${fSegEuro===s?'#1341c4':'#e2e6f0'}`,background:fSegEuro===s?'#1341c4':'white',color:fSegEuro===s?'white':'#6b7a99',fontSize:11,fontWeight:600,cursor:'pointer' }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:11,color:'#9aa6bf',marginBottom:10 }}>
              {euro?.rotulo} — acumulado do ano · {euro?.clientes70} de {euro?.clientesTotal} clientes formam 70% do faturamento (mesmo corte da tela Cliente) · média ponderada pela quantidade · produtos vendidos em real não entram
            </div>
            <div style={{ display:'flex',gap:16,marginBottom:10 }}>
              {FAIXAS_EURO.map(f => (
                <span key={f.k} style={{ display:'inline-flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600,color:'#374151' }}>
                  <span style={{ width:12,height:12,borderRadius:2,background:f.cor }} />{f.nome}
                </span>
              ))}
            </div>
            {prodEuro.length===0
              ? <div style={{ fontSize:12,color:'#9aa6bf' }}>Nenhum produto com preço em euro no período.</div>
              : <div style={{ maxHeight:520,overflowY:'auto',paddingRight:4 }}>
                  <div style={{ height:Math.max(160, prodEuro.length*34) }}><Bar data={bEuro.data} options={bEuro.opts} /></div>
                </div>}
          </div>

          {/* REGIÃO: todos os produtos */}
          <div style={st.card}>
            <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12 }}>
              <span style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>% de vendas por região (UF) — todos os produtos</span>
              <div style={{ display:'flex',gap:4,marginLeft:'auto' }}>
                {['Todos', ...SEGMENTOS].map(s => (
                  <button key={s} onClick={()=>setFSeg(s)} style={{ padding:'4px 12px',borderRadius:20,border:`1.5px solid ${fSeg===s?'#1341c4':'#e2e6f0'}`,background:fSeg===s?'#1341c4':'white',color:fSeg===s?'white':'#6b7a99',fontSize:11,fontWeight:600,cursor:'pointer' }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',gap:14,flexWrap:'wrap',marginBottom:12 }}>
              {ufsOrdem.map(uf => (
                <span key={uf} style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,color:'#374151' }}>
                  <span style={{ width:10,height:10,borderRadius:2,background:COR_UFS[uf]||'#9ca3af' }} />{uf}
                </span>
              ))}
              <span style={{ fontSize:11,color:'#9aa6bf' }}>· passe o mouse na barra para ver % e valor · clique no produto para realçar</span>
            </div>
            <div style={{ maxHeight:460,overflowY:'auto',paddingRight:4 }}>
              {prodRegiao.length===0 && <div style={{ fontSize:12,color:'#9aa6bf' }}>Nenhum produto deste segmento no período.</div>}
              {prodRegiao.map((p,i)=>(
                <div key={p.produto} onClick={()=>pick('produto',p.produto)} style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6,cursor:'pointer',opacity:contribui(linhas,'produto',p.produto,sel)?1:0.4 }}>
                  <span style={{ width:20,fontSize:10,color:'#9aa6bf',textAlign:'right' }}>{i+1}</span>
                  <span title={p.produto} style={{ width:190,fontSize:11,fontWeight:isSel('produto',p.produto)?800:600,color:'#0f1729',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.produto}</span>
                  <div style={{ flex:1,display:'flex',height:20,borderRadius:5,overflow:'hidden',gap:1,background:'#f4f6fb' }}>
                    {[...p.ufs].sort((a,b)=>ufsOrdem.indexOf(a.uf)-ufsOrdem.indexOf(b.uf)).map(u=>(
                      <div key={u.uf} title={`${p.produto} · ${u.uf}: ${pctFmt(u.pct)} · ${fmtVal(u.valor)}`} style={{ flex:u.pct,minWidth:2,height:'100%',background:COR_UFS[u.uf]||'#9ca3af',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white',overflow:'hidden',whiteSpace:'nowrap' }}>
                        {u.pct>=12?`${u.uf} ${Math.round(u.pct)}%`:''}
                      </div>
                    ))}
                  </div>
                  <span style={{ width:78,fontSize:11,fontWeight:700,textAlign:'right',color:'#374151' }}>{fmtVal(p.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PARTICIPAÇÃO POR ESTADO: MÊS E ACUMULADO */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            <ParticipacaoUf titulo='Participação de cada estado no faturamento' sub={per.rotuloMes + ' — mês fechado'} lista={ufMes} linhas={per.mes} sel={sel} onPick={pick} />
            <ParticipacaoUf titulo='Participação de cada estado no faturamento' sub={per.rotuloAcum + ' — acumulado do ano'} lista={ufAcum} linhas={per.acum} sel={sel} onPick={pick} />
          </div>

          {/* RANKING COMPLETO */}
          <div>
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
