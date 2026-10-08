import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
import { tabelaAgrupada } from '../../lib/realce'
import { recortes, somaPor, curva, nomeMes } from '../../lib/periodo'
import { RealceBanner } from '../../components/RealceBanner'
import { ParticipacaoUf } from '../../components/ParticipacaoUf'
import { MultiSelect, MESES_OPC, useOpcoes } from '../../components/MultiSelect'
import { PAGINA_IDS, nomePagina, podeApresentar } from '../../lib/paginas'
import { faixasPreco, linhaSuspeita, rotuloMeses } from '../../lib/precos'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

function fmtVal(v){if(!v)return'—';if(v>=1e6)return'R$ '+(v/1e6).toFixed(2).replace('.',',')+' Mi';if(v>=1e3)return'R$ '+(v/1e3).toFixed(0)+' Mil';return'R$ '+Math.round(v)}
function fmtN(v){return Number(Math.round(v||0)).toLocaleString('pt-BR')}
const fmtPct = v => (v||0).toFixed(1).replace('.', ',') + '%'
const fmtEur = v => v==null ? '—' : '€ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtRs = v => 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtData = d => d ? d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4) : '—'
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Cliente({ user }) {
  const router = useRouter()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fAno, setFAno] = useState([])
  const [fMes, setFMes] = useState([])
  const [fVend, setFVend] = useState([])
  const [cliFoco, setCliFoco] = useState(null) // cliente de "o que comprou" e da linha mês a mês
  const [sel, setSel] = useState(null)
  const [precos, setPrecos] = useState(null) // compras do cliente em foco, todos os anos
  const [anoB, setAnoB] = useState(null), [anoC, setAnoC] = useState(null)
  const [aberto, setAberto] = useState(null) // produto com as compras abertas
  const opcoes = useOpcoes()

  useEffect(() => { carregar() }, [fAno, fMes, fVend])
  useEffect(() => { carregarPrecos() }, [cliFoco, fVend])

  // anos do comparativo: por padrão os 2 mais recentes da base
  const anosOpc = (opcoes.anos || []).map(Number).sort((a,b)=>a-b)
  useEffect(() => { if (anoB == null && anosOpc.length) { setAnoC(anosOpc[anosOpc.length-1]); setAnoB(anosOpc[Math.max(0, anosOpc.length-2)]) } }, [opcoes.anos])

  async function carregarPrecos() {
    setAberto(null)
    if (!cliFoco) { setPrecos(null); return }
    const p = new URLSearchParams({ cliente: cliFoco })
    if (fVend.length) p.set('vendedor', fVend.join(','))
    const r = await fetch('/api/dados/cliente-precos?' + p)
    if (r.status === 401) { router.push('/'); return }
    const d = await r.json()
    setPrecos({ ...d, cliente: cliFoco })
  }

  async function carregar() {
    setLoading(true)
    const p = new URLSearchParams()
    if (fAno.length) p.set('ano', fAno.join(','))
    if (fMes.length) p.set('mes', fMes.join(','))
    if (fVend.length) p.set('vendedor', fVend.join(','))
    const r = await fetch('/api/dados/cliente?' + p)
    if (r.status === 401) { router.push('/'); return }
    const d = await r.json()
    setDados(d)
    setSel(null)
    setCliFoco(router.query.cliente || d.ranking?.[0]?.cliente || null) // ?cliente= vem da tela Comparação
    setLoading(false)
  }

  const linhas = dados?.linhas || []
  function pick(dim, value) {
    if (!value) return
    setSel(s => (s && s.dim === dim && s.value === value) ? null : { dim, value })
    if (dim === 'cliente') setCliFoco(value)
  }
  const isSel = (dim, value) => sel && sel.dim === dim && sel.value === value

  // mês fechado x acumulado do ano (lib/periodo.js)
  const per = recortes(linhas)
  const rankMes = somaPor(per.mes, 'cliente')
  const rankAcum = somaPor(per.acum, 'cliente')
  const c70Mes = curva(rankMes, 70)
  const c70Acum = curva(rankAcum, 70)
  const ufMes = somaPor(per.mes, 'uf'), ufAcum = somaPor(per.acum, 'uf')

  // produtos comprados pelo cliente em foco (no período filtrado)
  const comprasCliente = (() => {
    if (!cliFoco) return []
    const p = {}
    for (const r of linhas) { if (r.cliente !== cliFoco) continue; if (!p[r.produto]) p[r.produto] = { qtde: 0, valor: 0 }; p[r.produto].qtde += r.qtde; p[r.produto].valor += r.valor_total }
    return Object.entries(p).map(([produto, d]) => ({ produto, qtde: d.qtde, valor: Math.round(d.valor * 100) / 100 })).sort((a, b) => b.valor - a.valor)
  })()
  const totalCompra = comprasCliente.reduce((s, r) => s + r.valor, 0)

  // % do cliente em foco sobre o faturamento de cada mês do período
  const serieMes = (() => {
    const m = {}
    for (const r of linhas) {
      const k = r.ano * 100 + r.mes
      if (!m[k]) m[k] = { ano: r.ano, mes: r.mes, total: 0, cli: 0 }
      m[k].total += r.valor_total
      if (r.cliente === cliFoco) m[k].cli += r.valor_total
    }
    return Object.keys(m).sort().map(k => ({ ...m[k], pct: m[k].total > 0 ? m[k].cli / m[k].total * 100 : 0 }))
  })()

  // Comparativo do cliente entre dois anos, por produto, com os preços pagos.
  // Período comparável: se o ano comparado é o corrente, os dois anos vão só
  // até o último mês carregado (senão jan–dez contra jan–set faz tudo "cair").
  const mesesCmp = (() => {
    let ms = fMes.length ? fMes.map(Number).sort((a,b)=>a-b) : [1,2,3,4,5,6,7,8,9,10,11,12]
    const u = precos?.ultimo
    if (u && anoC === u.ano) ms = ms.filter(m => m <= u.mes)
    return ms
  })()
  const rotuloCmp = mesesCmp.length === 12 ? 'ano inteiro'
    : mesesCmp.length && mesesCmp.length === mesesCmp[mesesCmp.length-1]-mesesCmp[0]+1 ? `${MESES_CURTO[mesesCmp[0]-1]} a ${MESES_CURTO[mesesCmp[mesesCmp.length-1]-1]}`
    : mesesCmp.map(m => MESES_CURTO[m-1]).join(', ') || '—'
  const comprasCmp = (precos?.cliente === cliFoco ? precos.compras : []).filter(c => (c.ano === anoB || c.ano === anoC) && mesesCmp.includes(c.mes))
  const prodCmp = (() => {
    if (anoB == null || anoC == null || anoB === anoC) return []
    const m = {}
    for (const c of comprasCmp) {
      const o = m[c.produto] ??= { produto:c.produto, v0:0, v1:0, q0:0, q1:0, c0:[], c1:[] }
      if (c.ano === anoB) { o.v0 += c.valor_total; o.q0 += c.qtde; o.c0.push(c) } else { o.v1 += c.valor_total; o.q1 += c.qtde; o.c1.push(c) }
    }
    const cm = precos?.cotMediana || {}
    return Object.values(m)
      .map(o => ({ ...o, f0: faixasPreco(o.c0, cm), f1: faixasPreco(o.c1, cm), diff: o.v1 - o.v0, varV: o.v0 > 0 && o.v1 > 0 ? (o.v1-o.v0)/o.v0*100 : null }))
      .sort((a,b) => a.diff - b.diff) // maior queda primeiro
  })()
  const totCmp = prodCmp.reduce((s,p)=>({ v0:s.v0+p.v0, v1:s.v1+p.v1 }), { v0:0, v1:0 })

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const faixa = l => [['#','Cliente','UF','% Individual','% Acumulado','Valor'], ...l.map((d,i)=>[i+1,d.chave,d.uf,Math.round(d.pct*100)/100,Math.round(d.acumulado*100)/100,Math.round(d.valor*100)/100])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(faixa(c70Mes)), '70% ' + per.rotuloMes.replace('/', '-'))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(faixa(c70Acum)), '70% acumulado')
    const s3 = [['#','Cliente','UF','% do mês','Valor'], ...rankMes.map((d,i)=>[i+1,d.chave,d.uf,Math.round(d.pct*100)/100,Math.round(d.valor*100)/100])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Participação no mês')
    const s4 = [['#','Cliente','UF','Cidade','QTDE','% Valor','Valor'], ...(dados?.ranking||[]).map((d,i)=>[i+1,d.cliente,d.uf,d.cidade,d.qtd,d.pct,d.valor])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4), 'Ranking Clientes')
    if (precos?.cliente === cliFoco && precos.compras.length) {
      const cm = precos.cotMediana || {}
      const s5 = [['Cliente','Data','NF','Produto','QTDE','R$ unit.','Cotação','€ pago','Cotação fora do padrão'],
        ...[...precos.compras].sort((a,b)=>(a.produto||'').localeCompare(b.produto||'')||(a.data||'').localeCompare(b.data||''))
          .map(c=>[cliFoco, fmtData(c.data), c.nf, c.produto, c.qtde, c.valor_unit, c.cotacao_euro||'', c.preco_euro?Math.round(c.preco_euro*100)/100:'', linhaSuspeita(c,cm)?'sim':''])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s5), 'Preços do cliente')
    }
    XLSX.writeFile(wb, 'Clamalu_Cliente.xlsx')
  }

  const st = {
    header:{background:'#0b2a8a',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',height:58,position:'sticky',top:0,zIndex:100},
    filtros:{background:'white',borderBottom:'1px solid #e2e6f0',padding:'10px 28px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'},
    label:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99'},
    kpiBar:{background:'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)',padding:'20px 28px',display:'grid',gridTemplateColumns:'repeat(3,1fr)'},
    kpi:{textAlign:'center',padding:'8px 16px',borderRight:'1px solid rgba(255,255,255,0.12)'},
    kpiVal:{fontSize:38,fontWeight:800,color:'white',letterSpacing:-1,lineHeight:1},
    kpiLbl:{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'0.8px',marginTop:5},
    page:{padding:'20px 28px',display:'flex',flexDirection:'column',gap:16},
    card:{background:'white',borderRadius:12,boxShadow:'0 2px 8px rgba(19,65,196,0.08)',border:'1px solid #e2e6f0',padding:'18px 20px'},
    cardTitle:{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99'},
    sub:{fontSize:11,color:'#9aa6bf',margin:'4px 0 12px'},
    th:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.7px',color:'#6b7a99',padding:'0 8px 10px',borderBottom:'2px solid #e2e6f0',textAlign:'left',position:'sticky',top:0,background:'white'},
    td:{padding:'7px 8px',borderBottom:'1px solid #f3f4f6',fontSize:12,color:'#0f1729',verticalAlign:'middle'},
    pos:{display:'inline-flex',width:20,height:20,borderRadius:'50%',background:'#f4f6fb',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700},
    uf:{padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'#e8eeff',color:'#1341c4'},
  }

  // ranking completo de clientes: filtra quando há realce
  const ranking = sel
    ? tabelaAgrupada(linhas,'cliente',sel).map(d=>({ cliente:d.chave, uf:d.uf, qtd:d.qtd, valor:d.valor, pct:d.pct })).slice(0,80)
    : (dados?.ranking || [])

  // tabela de uma faixa de 70%: clicar põe o cliente em foco
  function tabela70(lista) { // função, não componente: assim a rolagem não reinicia a cada clique
    return (
      <div style={{ maxHeight:340,overflowY:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead><tr><th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th><th style={{ ...st.th,textAlign:'right' }}>%</th><th style={{ ...st.th,textAlign:'right' }}>Acum.</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
          <tbody>
            {lista.length===0 && <tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={6}>Sem vendas no período.</td></tr>}
            {lista.map((c,i)=>(
              <tr key={c.chave} onClick={()=>pick('cliente',c.chave)} style={{ cursor:'pointer',background:cliFoco===c.chave?'#e8f7ee':(isSel('cliente',c.chave)?'#e8eeff':'') }}>
                <td style={st.td}><span style={st.pos}>{i+1}</span></td>
                <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{c.chave}</td>
                <td style={st.td}><span style={st.uf}>{c.uf}</span></td>
                <td style={{ ...st.td,textAlign:'right' }}>{fmtPct(c.pct)}</td>
                <td style={{ ...st.td,textAlign:'right',fontWeight:700,color:'#1341c4' }}>{fmtPct(c.acumulado)}</td>
                <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(c.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh',background:'#f4f6fb',fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:13 }}>
      <Head><title>Clamalu · Cliente</title></Head>
      <div style={st.header}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0b2a8a' }}>CL</div>
          <div><div style={{ color:'white',fontSize:16,fontWeight:700 }}>Clamalu</div><div style={{ color:'rgba(255,255,255,0.5)',fontSize:11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {PAGINA_IDS.filter(p=>user?.paginas?.includes(p)).map(p=>(
            <button key={p} onClick={()=>router.push('/dashboard/'+p)} style={{ padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'uppercase',background:p==='cliente'?'white':'rgba(255,255,255,0.1)',color:p==='cliente'?'#0b2a8a':'rgba(255,255,255,0.75)' }}>
              {nomePagina(p)}
            </button>
          ))}
          {podeApresentar(user) && <button onClick={() => router.push('/apresentacao')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#16a34a', color: 'white', marginLeft: 8 }}>▶ Apresentação</button>}
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
          {/* 70% DO FATURAMENTO: MÊS E ACUMULADO */}
          <div style={st.card}>
            <div style={st.cardTitle}>Clientes que representam 70% do faturamento</div>
            <div style={st.sub}>Clique num cliente para ver o que ele comprou e a participação dele mês a mês.</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
              <div>
                <div style={{ fontSize:12,color:'#374151',marginBottom:8 }}><b>{per.rotuloMes}</b> — mês fechado: <b style={{ color:'#1341c4' }}>{c70Mes.length}</b> de {rankMes.length} clientes somam 70%</div>
                {tabela70(c70Mes)}
              </div>
              <div>
                <div style={{ fontSize:12,color:'#374151',marginBottom:8 }}><b>{per.rotuloAcum}</b> — acumulado do ano: <b style={{ color:'#1341c4' }}>{c70Acum.length}</b> de {rankAcum.length} clientes somam 70%</div>
                {tabela70(c70Acum)}
              </div>
            </div>
          </div>

          {/* CLIENTE EM FOCO: O QUE COMPROU + % MÊS A MÊS */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start' }}>
            <div style={st.card}>
              <div style={st.cardTitle}>O que o cliente comprou no período</div>
              {cliFoco ? (
                <>
                  <div style={{ fontSize:12,fontWeight:700,color:'#0f1729',margin:'8px 0 2px' }}>{cliFoco}</div>
                  <div style={{ fontSize:11,color:'#6b7a99',marginBottom:12 }}>{comprasCliente.length} produtos · {fmtVal(totalCompra)} no total</div>
                  <div style={{ maxHeight:260,overflowY:'auto' }}>
                    <table style={{ width:'100%',borderCollapse:'collapse' }}>
                      <thead><tr><th style={st.th}>#</th><th style={st.th}>Produto</th><th style={{ ...st.th,textAlign:'right' }}>QTDE</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
                      <tbody>
                        {comprasCliente.length===0&&<tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={4}>Sem compras no período.</td></tr>}
                        {comprasCliente.map((p,i)=>(
                          <tr key={p.produto}>
                            <td style={st.td}><span style={st.pos}>{i+1}</span></td>
                            <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{p.produto}</td>
                            <td style={{ ...st.td,textAlign:'right' }}>{fmtN(p.qtde)}</td>
                            <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(p.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div style={{ padding:20,textAlign:'center',color:'#9aa6bf',fontSize:12 }}>Clique num cliente.</div>}
            </div>
            <div style={st.card}>
              <div style={st.cardTitle}>Participação % do cliente por mês</div>
              <div style={st.sub}>{cliFoco ? <>Quanto <b style={{ color:'#374151' }}>{cliFoco}</b> representou do faturamento de cada mês.</> : 'Clique num cliente.'}</div>
              <div style={{ height:260 }}>
                {cliFoco && <Line data={{ labels:serieMes.map(m=>nomeMes(m.ano,m.mes)), datasets:[{ label:'% no mês',data:serieMes.map(m=>Math.round(m.pct*10)/10),borderColor:'#1341c4',backgroundColor:'rgba(19,65,196,0.08)',borderWidth:2.5,pointRadius:4,fill:true,tension:0.3 }] }}
                  options={{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fmtPct(c.raw)+' do mês · '+fmtVal(serieMes[c.dataIndex].cli)}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#f0f2f8'},ticks:{callback:v=>v+'%',font:{size:10}},min:0}} }} />}
              </div>
            </div>
          </div>

          {/* CLIENTE EM FOCO: COMPARATIVO ENTRE ANOS COM OS PREÇOS PAGOS (veio da tela Comparação em 08/10/2026) */}
          {cliFoco && (
            <div style={st.card}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
                <div style={st.cardTitle}>Onde o consumo do cliente mudou — preços pagos</div>
                <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12 }}>
                  <select value={anoB ?? ''} onChange={e=>setAnoB(Number(e.target.value))} style={{ padding:'4px 6px',borderRadius:6,border:'1.5px solid #e2e6f0' }}>{anosOpc.map(a=><option key={a} value={a}>{a}</option>)}</select>
                  <span style={{ color:'#6b7a99' }}>→</span>
                  <select value={anoC ?? ''} onChange={e=>setAnoC(Number(e.target.value))} style={{ padding:'4px 6px',borderRadius:6,border:'1.5px solid #e2e6f0' }}>{anosOpc.map(a=><option key={a} value={a}>{a}</option>)}</select>
                </div>
              </div>
              <div style={{ fontSize:12,fontWeight:700,color:'#0f1729',margin:'8px 0 2px' }}>{cliFoco}</div>
              <div style={st.sub}>
                Período: <b>{rotuloCmp}</b> nos dois anos · {fmtVal(totCmp.v0)} em {anoB} → {fmtVal(totCmp.v1)} em {anoC} · maior queda primeiro. Cada preço é o que o cliente pagou, com os meses e a quantidade. Clique no produto para ver compra a compra.
              </div>
              {precos?.cliente !== cliFoco ? <div style={{ padding:20,textAlign:'center',color:'#9aa6bf',fontSize:12 }}>Carregando compras...</div>
              : anoB === anoC ? <div style={{ padding:20,textAlign:'center',color:'#9aa6bf',fontSize:12 }}>Escolha dois anos diferentes.</div>
              : (
              <div style={{ maxHeight:520,overflowY:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>
                    <th style={st.th}>Produto</th>
                    <th style={{ ...st.th,textAlign:'right' }}>Qtd {anoB}</th><th style={{ ...st.th,textAlign:'right' }}>Qtd {anoC}</th>
                    <th style={{ ...st.th,textAlign:'right' }}>R$ {anoB}</th><th style={{ ...st.th,textAlign:'right' }}>R$ {anoC}</th>
                    <th style={{ ...st.th,textAlign:'right' }}>Var.</th>
                    <th style={{ ...st.th,borderLeft:'2px solid #e2e6f0' }}>Preços pagos {anoB}</th><th style={st.th}>Preços pagos {anoC}</th>
                  </tr></thead>
                  <tbody>
                    {prodCmp.length===0 && <tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={8}>Sem compras nesses anos.</td></tr>}
                    {prodCmp.map(p => {
                      const abre = aberto === p.produto
                      const linhasAbertas = abre ? [...p.c0, ...p.c1].sort((a,b)=>(a.data||'').localeCompare(b.data||'')) : []
                      return [
                        <tr key={p.produto} onClick={()=>setAberto(abre?null:p.produto)} style={{ cursor:'pointer',background:abre?'#f7f9ff':'' }}>
                          <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{abre?'▾':'▸'} {p.produto}</td>
                          <td style={{ ...st.td,textAlign:'right' }}>{p.q0?fmtN(p.q0):'—'}</td>
                          <td style={{ ...st.td,textAlign:'right',fontWeight:p.q1!==p.q0?700:400,color:p.q1<p.q0?'#dc2626':p.q1>p.q0?'#16a34a':'#0f1729' }}>{p.q1?fmtN(p.q1):'—'}</td>
                          <td style={{ ...st.td,textAlign:'right' }}>{fmtVal(p.v0)}</td><td style={{ ...st.td,textAlign:'right' }}>{fmtVal(p.v1)}</td>
                          <td style={{ ...st.td,textAlign:'right',whiteSpace:'nowrap',fontWeight:700,color:p.diff>=0?'#16a34a':'#dc2626' }}>
                            {p.v0===0 ? <span style={{ color:'#1341c4' }}>novo</span> : p.v1===0 ? 'parou' : (p.varV>=0?'▲':'▼')+' '+Math.abs(p.varV).toFixed(1).replace('.',',')+'%'}
                          </td>
                          {[p.f0,p.f1].map((fs,j)=>(
                            <td key={j} style={{ ...st.td,fontSize:11,...(j===0?{borderLeft:'2px solid #e2e6f0'}:{}) }}>
                              {fs.length===0 ? <span style={{ color:'#9aa6bf' }}>{(j?p.q1:p.q0) ? 'vendido em R$' : '—'}</span> : fs.map((f,i)=>(
                                <div key={i} style={{ whiteSpace:'nowrap' }} title={f.suspeita?'Cotação do dia fora do padrão do mês: este preço em euro provavelmente está errado na planilha':''}>
                                  <b style={{ color:f.suspeita?'#b45309':'#0f1729' }}>{fmtEur(f.preco)}</b>{f.suspeita&&' ⚠'}
                                  <span style={{ color:'#9aa6bf' }}> · {rotuloMeses(f)} · {fmtN(f.qtde)} un</span>
                                </div>
                              ))}
                            </td>
                          ))}
                        </tr>,
                        abre && (
                          <tr key={p.produto+'-x'}><td colSpan={8} style={{ padding:'4px 8px 12px 28px',background:'#f7f9ff',borderBottom:'1px solid #e2e6f0' }}>
                            <table style={{ borderCollapse:'collapse',fontSize:11 }}>
                              <thead><tr>{['Data','NF','Qtde','R$ unit.','Cotação','€ pago'].map(h=><th key={h} style={{ ...st.th,background:'#f7f9ff',position:'static',textAlign:h==='Data'||h==='NF'?'left':'right',fontSize:9 }}>{h}</th>)}</tr></thead>
                              <tbody>{linhasAbertas.map((c,i)=>{ const s=linhaSuspeita(c,precos.cotMediana||{}); return (
                                <tr key={i}>
                                  <td style={{ ...st.td,fontSize:11 }}>{fmtData(c.data)}</td>
                                  <td style={{ ...st.td,fontSize:11 }}>{c.nf||'—'}</td>
                                  <td style={{ ...st.td,fontSize:11,textAlign:'right' }}>{fmtN(c.qtde)}</td>
                                  <td style={{ ...st.td,fontSize:11,textAlign:'right' }}>{fmtRs(c.valor_unit)}</td>
                                  <td style={{ ...st.td,fontSize:11,textAlign:'right',color:s?'#b45309':undefined,fontWeight:s?700:400 }} title={s?'Fora do padrão do mês ('+String(Math.round(precos.cotMediana[c.ano+'-'+c.mes]*1e4)/1e4).replace('.',',')+')':''}>{c.cotacao_euro?String(c.cotacao_euro).replace('.',','):'—'}{s&&' ⚠'}</td>
                                  <td style={{ ...st.td,fontSize:11,textAlign:'right',fontWeight:700 }}>{c.preco_euro?fmtEur(c.preco_euro):'—'}</td>
                                </tr>
                              )})}</tbody>
                            </table>
                          </td></tr>
                        )
                      ]
                    })}
                  </tbody>
                </table>
              </div>
              )}
              <div style={{ fontSize:10,color:'#9aa6bf',marginTop:8 }}>Dois preços no mesmo ano = reajuste no período. <b style={{ color:'#b45309' }}>⚠</b> = a cotação daquele dia está fora do padrão do mês, então o € dessa compra provavelmente está errado na planilha. "Vendido em R$" = produto sem cotação em euro.</div>
            </div>
          )}

          {/* PARTICIPAÇÃO DE CADA CLIENTE NO MÊS */}
          <div style={st.card}>
            <div style={st.cardTitle}>Participação de cada cliente no mês — {per.rotuloMes}</div>
            <div style={st.sub}>Todos os {rankMes.length} clientes que compraram no mês, do maior para o menor.</div>
            <div style={{ maxHeight:380,overflowY:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr><th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th><th style={{ ...st.th,textAlign:'right' }}>Faturamento</th><th style={{ ...st.th,textAlign:'right' }}>% do mês</th><th style={{ ...st.th,width:'30%' }}></th></tr></thead>
                <tbody>
                  {rankMes.map((c,i)=>(
                    <tr key={c.chave} onClick={()=>pick('cliente',c.chave)} style={{ cursor:'pointer',background:cliFoco===c.chave?'#e8f7ee':(isSel('cliente',c.chave)?'#e8eeff':'') }}>
                      <td style={st.td}><span style={st.pos}>{i+1}</span></td>
                      <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{c.chave}</td>
                      <td style={st.td}><span style={st.uf}>{c.uf}</span></td>
                      <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(c.valor)}</td>
                      <td style={{ ...st.td,textAlign:'right' }}>{fmtPct(c.pct)}</td>
                      <td style={st.td}>
                        <div style={{ height:8,background:'#f4f6fb',borderRadius:4,overflow:'hidden' }}>
                          <div style={{ width:(rankMes[0]?.pct ? c.pct/rankMes[0].pct*100 : 0)+'%',height:'100%',background:'#1341c4',borderRadius:4 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PARTICIPAÇÃO POR ESTADO: MÊS E ACUMULADO */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            <ParticipacaoUf titulo='Participação de cada estado no faturamento' sub={per.rotuloMes + ' — mês fechado'} lista={ufMes} linhas={per.mes} sel={sel} onPick={pick} />
            <ParticipacaoUf titulo='Participação de cada estado no faturamento' sub={per.rotuloAcum + ' — acumulado do ano'} lista={ufAcum} linhas={per.acum} sel={sel} onPick={pick} />
          </div>

          {/* RANKING COMPLETO */}
          <div style={st.card}>
            <div style={{ ...st.cardTitle,marginBottom:14 }}>Ranking completo de clientes {sel && <span style={{ fontWeight:500,textTransform:'none',color:'#ea8c00' }}>· filtrado por {sel.value}</span>}</div>
            <div style={{ maxHeight:300,overflowY:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr><th style={st.th}>#</th><th style={st.th}>Cliente</th><th style={st.th}>UF</th><th style={{ ...st.th,textAlign:'right' }}>QTDE</th><th style={{ ...st.th,textAlign:'right' }}>%</th><th style={{ ...st.th,textAlign:'right' }}>Valor</th></tr></thead>
                <tbody>
                  {ranking.length===0 && <tr><td style={{ ...st.td,color:'#9aa6bf' }} colSpan={6}>Nenhum cliente para este realce.</td></tr>}
                  {ranking.map((c,i)=>(
                  <tr key={i} onClick={()=>pick('cliente',c.cliente)} style={{ cursor:'pointer',background:isSel('cliente',c.cliente)?'#e8eeff':'' }}>
                    <td style={st.td}><span style={st.pos}>{i+1}</span></td>
                    <td style={{ ...st.td,fontWeight:600,fontSize:11 }}>{c.cliente}</td>
                    <td style={st.td}><span style={st.uf}>{c.uf}</span></td>
                    <td style={{ ...st.td,textAlign:'right' }}>{fmtN(c.qtd)}</td>
                    <td style={{ ...st.td,textAlign:'right' }}>{c.pct}%</td>
                    <td style={{ ...st.td,textAlign:'right',fontWeight:700 }}>{fmtVal(c.valor)}</td>
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
  if (!user.paginas?.includes('cliente')) return { redirect: { destination: '/dashboard/'+(user.paginas?.[0]||''), permanent: false } }
  return { props: { user } }
}
