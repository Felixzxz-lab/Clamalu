import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { MultiSelect } from './MultiSelect'
import { PAGINA_IDS, nomePagina, podeApresentar } from '../lib/paginas'
import { COR_UFS } from './ParticipacaoUf'
import { ufsDe, tabelaUf, clientesPorUf, volumePorUf, rendimento, sharePorUf, rotulo } from '../lib/mapeamento'

// Tela do mapeamento de mercado, usada por /dashboard/culturas e /dashboard/enzimas.
// Blocos e textos seguem o escopo visual aprovado em 22/09/2026. Tudo em número
// E porcentagem, por UF e geral — pedido do cliente.

const cu = uf => COR_UFS[uf] || '#9ca3af'
const mil = n => Math.round(n || 0).toLocaleString('pt-BR')
const pct = n => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
const dec2 = n => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const milhoes = n => (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'

const st = {
  header: { background: '#0b2a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 58, position: 'sticky', top: 0, zIndex: 100 },
  filtros: { background: 'white', borderBottom: '1px solid #e2e6f0', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6b7a99' },
  kpiBar: { background: 'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' },
  kpi: { textAlign: 'center', padding: '8px 16px', borderRight: '1px solid rgba(255,255,255,0.12)' },
  kpiVal: { fontSize: 32, fontWeight: 800, color: 'white', letterSpacing: -1, lineHeight: 1 },
  kpiLbl: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 5 },
  page: { padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(19,65,196,0.08)', border: '1px solid #e2e6f0', padding: '18px 20px' },
  cardTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#6b7a99' },
  sub: { fontSize: 12, color: '#6b7a99', margin: '4px 0 14px' },
  g2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' },
  th: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#6b7a99', padding: '0 8px 9px', borderBottom: '2px solid #e2e6f0', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'white' },
  td: { padding: '7px 8px', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#0f1729', verticalAlign: 'middle' },
  n: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tot: { fontWeight: 800, background: '#f4f6fb' },
}
const thN = { ...st.th, textAlign: 'right' }
const tdN = { ...st.td, ...st.n }
const muted = { color: '#6b7a99' }

function ChipUf({ uf }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}><i style={{ width: 9, height: 9, borderRadius: 2, background: cu(uf), display: 'inline-block' }} />{uf}</span>
}

// categoria × UF com número e % da coluna, mais o geral
function TabelaUf({ dados, ufs, titulo }) {
  const { cats, totais } = dados
  return (
    <div style={{ maxHeight: 440, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={st.th}>{titulo}</th>
            {ufs.map(u => <th key={u} colSpan={2} style={{ ...thN, textAlign: 'center' }}><ChipUf uf={u} /></th>)}
            <th colSpan={2} style={{ ...thN, textAlign: 'center' }}>Geral</th>
          </tr>
        </thead>
        <tbody>
          {cats.map(c => (
            <tr key={c.cat}>
              <td style={{ ...st.td, fontWeight: 600, color: /^(Sem|Não informado)/.test(c.cat) ? '#6b7a99' : '#0f1729' }}>{c.cat}</td>
              {[...ufs, 'GERAL'].map(u => (
                <FragCel key={u} n={c[u] || 0} tot={totais[u] || 0} forte={u === 'GERAL'} />
              ))}
            </tr>
          ))}
          <tr>
            <td style={{ ...st.td, ...st.tot }}>Total</td>
            {[...ufs, 'GERAL'].map(u => <FragCel key={u} n={totais[u] || 0} tot={totais[u] || 0} forte estilo={st.tot} />)}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
function FragCel({ n, tot, forte, estilo }) {
  return (
    <>
      <td style={{ ...tdN, ...estilo, fontWeight: forte ? 700 : 400, opacity: n ? 1 : 0.35 }}>{mil(n)}</td>
      <td style={{ ...tdN, ...estilo, ...muted, opacity: n ? 1 : 0.35 }}>{tot ? pct(n / tot * 100) : '—'}</td>
    </>
  )
}

function Rosca({ itens }) { // [{ uf, pct }]
  let a = 0
  const g = itens.map(u => { const s = `${cu(u.uf)} ${a}% ${a + u.pct}%`; a += u.pct; return s }).join(',')
  return <div style={{ width: 130, height: 130, borderRadius: '50%', background: `conic-gradient(${g || '#eee 0 100%'})`, position: 'relative', flexShrink: 0 }}>
    <div style={{ position: 'absolute', inset: 30, background: 'white', borderRadius: '50%' }} />
  </div>
}

function BarrasUf({ ufs, valores, fmt }) { // barras horizontais por UF
  const max = Math.max(...ufs.map(u => valores[u] || 0), 1)
  return ufs.map(u => (
    <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 34, fontSize: 12 }}><ChipUf uf={u} /></div>
      <div style={{ flex: 1, height: 20, background: '#f4f6fb', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: (valores[u] || 0) / max * 100 + '%', height: '100%', background: cu(u), borderRadius: 5 }} />
      </div>
      <div style={{ width: 90, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{fmt(valores[u] || 0)}</div>
    </div>
  ))
}

export default function Mapeamento({ user, categoria }) {
  const router = useRouter()
  const pagina = categoria === 'cultura' ? 'culturas' : 'enzimas'
  const nome = categoria === 'cultura' ? 'Culturas' : 'Enzimas e Coagulantes'
  const [todas, setTodas] = useState(null)
  const [carregadoEm, setCarregadoEm] = useState(null)
  const [erro, setErro] = useState(null)
  const [fUf, setFUf] = useState([])
  const [fQueijo, setFQueijo] = useState([])
  const [fDist, setFDist] = useState([])

  useEffect(() => {
    fetch('/api/dados/mapeamento?categoria=' + categoria).then(async r => {
      if (r.status === 401) { router.push('/'); return }
      const d = await r.json()
      if (!r.ok) { setErro(d.error || 'Erro ao carregar'); return }
      setTodas(d.linhas); setCarregadoEm(d.carregadoEm)
    }).catch(e => setErro(e.message))
  }, [categoria])

  const base = todas || []
  const opc = fn => [...new Set(base.map(fn))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const linhas = base.filter(l =>
    (!fUf.length || fUf.includes(l.uf)) &&
    (!fQueijo.length || fQueijo.includes(rotulo.queijo(l))) &&
    (!fDist.length || fDist.includes(rotulo.distribuidor(l))))

  const ufs = ufsDe(linhas)
  const cli = clientesPorUf(linhas)
  const share = sharePorUf(linhas)
  const vol = volumePorUf(linhas)
  const g = share.GERAL || { linhas: 0, linhasCla: 0, lt: 0, ltCla: 0, pctLinhas: 0, pctLt: 0 }
  const rendPor = rendimento(linhas, categoria === 'cultura' ? rotulo.apresentacao : rotulo.queijo)
  const rendUf = Object.fromEntries(rendimento(linhas, l => l.uf).map(o => [o.cat, o]))
  const rotRend = categoria === 'cultura' ? 'Cultura (apresentação)' : 'Tipo de queijo'

  async function exportar() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const aba = (titulo, t) => {
      const rows = [[titulo, ...ufs.flatMap(u => [u, u + ' %']), 'Geral', 'Geral %']]
      for (const c of [...t.cats, { cat: 'Total', ...t.totais }])
        rows.push([c.cat, ...[...ufs, 'GERAL'].flatMap(u => [c[u] || 0, t.totais[u] ? Math.round((c[u] || 0) / t.totais[u] * 1000) / 10 : 0])])
      return XLSX.utils.aoa_to_sheet(rows)
    }
    XLSX.utils.book_append_sheet(wb, aba('Tipo de queijo', tabelaUf(linhas, rotulo.queijo)), 'Tipo de queijo')
    XLSX.utils.book_append_sheet(wb, aba('Distribuidor', tabelaUf(linhas, rotulo.distribuidor)), 'Distribuidor')
    if (categoria === 'enzima') XLSX.utils.book_append_sheet(wb, aba('Marca', tabelaUf(linhas, rotulo.marca)), 'Marca')
    else XLSX.utils.book_append_sheet(wb, aba('Cultura', tabelaUf(linhas, rotulo.apresentacao)), 'Cultura')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['UF', 'Laticínios', 'Linhas', 'Leite L/ano', 'Queijo kg/ano', 'Linhas Clamalu', '% linhas Clamalu', '% leite Clamalu'],
      ...[...ufs, 'GERAL'].map(u => [u, cli[u]?.empresas || 0, cli[u]?.linhas || 0, Math.round(vol[u]?.leite || 0), Math.round(vol[u]?.kg || 0), share[u]?.linhasCla || 0, Math.round((share[u]?.pctLinhas || 0) * 10) / 10, Math.round((share[u]?.pctLt || 0) * 10) / 10])]), 'Por UF')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[rotRend, 'Linhas', 'Leite L/ano', 'Queijo kg/ano', 'L por kg'], ...rendPor.map(o => [o.cat, o.n, Math.round(o.leite), Math.round(o.kg), Math.round(o.rend * 100) / 100])]), 'Rendimento')
    XLSX.writeFile(wb, `Clamalu_${nome.split(' ')[0]}.xlsx`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 13 }}>
      <Head><title>Clamalu · {nomePagina(pagina)}</title></Head>
      <div style={st.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0b2a8a' }}>CL</div>
          <div><div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Clamalu</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PAGINA_IDS.filter(p => user?.paginas?.includes(p)).map(p => (
            <button key={p} onClick={() => router.push('/dashboard/' + p)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: p === pagina ? 'white' : 'rgba(255,255,255,0.1)', color: p === pagina ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
              {nomePagina(p)}
            </button>
          ))}
          {podeApresentar(user) && <button onClick={() => router.push('/apresentacao')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#16a34a', color: 'white', marginLeft: 8 }}>▶ Apresentação</button>}
          {user?.role === 'admin' && <button onClick={() => router.push('/admin')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white', marginLeft: 8 }}>⚙ Admin</button>}
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(220,38,38,0.7)', color: 'white', marginLeft: 4 }}>Sair</button>
        </div>
      </div>

      <div style={st.filtros}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={st.label}>UF</span>
          <MultiSelect options={opc(l => l.uf)} value={fUf} onChange={setFUf} accent="#a3b4f5" minWidth={100} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={st.label}>Tipo de queijo</span>
          <MultiSelect options={opc(rotulo.queijo)} value={fQueijo} onChange={setFQueijo} accent="#f5d6a3" minWidth={150} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={st.label}>Distribuidor</span>
          <MultiSelect options={opc(rotulo.distribuidor)} value={fDist} onChange={setFDist} accent="#a3dbb4" minWidth={150} /></div>
        <button style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e2e6f0', background: 'white', color: '#6b7a99', fontSize: 12, fontWeight: 500, cursor: 'pointer' }} onClick={() => { setFUf([]); setFQueijo([]); setFDist([]) }}>✕ Limpar</button>
        {carregadoEm && <span style={{ fontSize: 11, color: '#9aa6bf' }}>Planilha carregada em {new Date(carregadoEm).toLocaleDateString('pt-BR')}</span>}
        <button style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={exportar} disabled={!todas}>⬇ Exportar Excel</button>
      </div>

      <div style={st.kpiBar}>
        <div style={st.kpi}><div style={st.kpiVal}>{todas ? mil(cli.GERAL?.empresas) : '...'}</div><div style={st.kpiLbl}>Laticínios mapeados</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{todas ? mil(cli.GERAL?.linhas) : '...'}</div><div style={st.kpiLbl}>Linhas (empresa × queijo)</div></div>
        <div style={st.kpi}><div style={st.kpiVal}>{todas ? pct(g.pctLinhas) : '...'}</div><div style={st.kpiLbl}>São clientes Clamalu</div></div>
        <div style={{ ...st.kpi, borderRight: 'none' }}><div style={st.kpiVal}>{todas ? pct(g.pctLt) : '...'}</div><div style={st.kpiLbl}>Do volume de leite é Clamalu</div></div>
      </div>

      {erro ? <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{erro}</div>
      : !todas ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>Carregando dados...</div>
      : base.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>A planilha de mapeamento ainda não foi carregada.</div>
      : (
        <div style={st.page}>
          {/* PARTICIPAÇÃO DA CLAMALU */}
          <div style={st.card}>
            <div style={st.cardTitle}>Participação da Clamalu no mercado mapeado</div>
            <div style={st.sub}>De todos os laticínios levantados, clientes e não clientes, qual fatia já compra {nome.toLowerCase()} da Clamalu: em número de linhas e em volume de leite.</div>
            <div style={st.g2}>
              <div>
                {ufs.map(u => (
                  <div key={u} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><ChipUf uf={u} /><span style={muted}>{share[u].linhasCla} de {share[u].linhas} linhas</span></div>
                    {[['Linhas', share[u].pctLinhas, '#1341c4'], ['Leite', share[u].pctLt, '#93aafc']].map(([rot, v, cor]) => (
                      <div key={rot} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ width: 40, fontSize: 10, color: '#6b7a99' }}>{rot}</span>
                        <div style={{ flex: 1, height: 10, background: '#f4f6fb', borderRadius: 5, overflow: 'hidden' }}><div style={{ width: v + '%', height: '100%', background: cor }} /></div>
                        <span style={{ width: 48, fontSize: 11, fontWeight: 700, textAlign: 'right' }}>{pct(v)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={st.th}>Estado</th><th style={thN}>Linhas</th><th style={thN}>Clamalu</th><th style={thN}>%</th><th style={thN}>Leite/ano (L)</th><th style={thN}>% Clamalu</th></tr></thead>
                <tbody>
                  {[...ufs, 'GERAL'].map(u => { const s = share[u]; const t = u === 'GERAL' ? st.tot : {}; return (
                    <tr key={u}>
                      <td style={{ ...st.td, ...t }}>{u === 'GERAL' ? 'Geral' : <ChipUf uf={u} />}</td>
                      <td style={{ ...tdN, ...t }}>{mil(s.linhas)}</td><td style={{ ...tdN, ...t }}>{mil(s.linhasCla)}</td><td style={{ ...tdN, ...t, fontWeight: 700 }}>{pct(s.pctLinhas)}</td>
                      <td style={{ ...tdN, ...t }}>{mil(s.lt)}</td><td style={{ ...tdN, ...t, fontWeight: 700 }}>{pct(s.pctLt)}</td>
                    </tr>) })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CLIENTES POR UF */}
          <div style={st.card}>
            <div style={st.cardTitle}>Quantidade de clientes por estado</div>
            <div style={st.sub}>Em número e em porcentagem. <b>Laticínios</b> conta a empresa uma vez; <b>linhas</b> conta cada combinação de empresa e tipo de queijo (um mesmo laticínio pode aparecer com Mussarela, Prato e Provolone).</div>
            <div style={st.g2}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={st.th}>Estado</th><th style={thN}>Laticínios</th><th style={thN}>%</th><th style={thN}>Linhas</th><th style={thN}>%</th></tr></thead>
                <tbody>
                  {[...ufs, 'GERAL'].map(u => { const t = u === 'GERAL' ? st.tot : {}; return (
                    <tr key={u}>
                      <td style={{ ...st.td, ...t }}>{u === 'GERAL' ? 'Geral' : <ChipUf uf={u} />}</td>
                      <td style={{ ...tdN, ...t, fontWeight: 700 }}>{mil(cli[u].empresas)}</td><td style={{ ...tdN, ...t, ...muted }}>{pct(cli[u].empresas / cli.GERAL.empresas * 100)}</td>
                      <td style={{ ...tdN, ...t, fontWeight: 700 }}>{mil(cli[u].linhas)}</td><td style={{ ...tdN, ...t, ...muted }}>{pct(cli[u].linhas / cli.GERAL.linhas * 100)}</td>
                    </tr>) })}
                </tbody>
              </table>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center' }}>
                <Rosca itens={ufs.map(u => ({ uf: u, pct: cli[u].empresas / cli.GERAL.empresas * 100 }))} />
                <div>{ufs.map(u => <div key={u} style={{ fontSize: 12, marginBottom: 6 }}><ChipUf uf={u} /> <span style={{ marginLeft: 8, fontWeight: 700 }}>{pct(cli[u].empresas / cli.GERAL.empresas * 100)}</span> <span style={muted}>dos laticínios</span></div>)}</div>
              </div>
            </div>
          </div>

          {/* TIPOS DE QUEIJO */}
          <div style={st.card}>
            <div style={st.cardTitle}>Tipos de queijo por estado</div>
            <div style={st.sub}>Quantas linhas de cada tipo de queijo existem em cada estado, em número e em porcentagem da coluna.</div>
            <TabelaUf dados={tabelaUf(linhas, rotulo.queijo)} ufs={ufs} titulo="Tipo de queijo" />
          </div>

          {/* VOLUME DE LEITE (só enzimas, como no escopo) */}
          {categoria === 'enzima' && (
            <div style={st.card}>
              <div style={st.cardTitle}>Volume de leite por ano, por estado</div>
              <div style={st.sub}>Soma do volume declarado pelos laticínios mapeados, em litros por ano. Cada empresa × tipo de queijo conta uma vez.</div>
              <div style={st.g2}>
                <div style={{ paddingTop: 8 }}><BarrasUf ufs={ufs} valores={Object.fromEntries(ufs.map(u => [u, vol[u].leite]))} fmt={v => milhoes(v) + ' L'} /></div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={st.th}>Estado</th><th style={thN}>Leite (L/ano)</th><th style={thN}>%</th><th style={thN}>Queijo (kg/ano)</th><th style={thN}>%</th></tr></thead>
                  <tbody>
                    {[...ufs, 'GERAL'].map(u => { const t = u === 'GERAL' ? st.tot : {}; return (
                      <tr key={u}>
                        <td style={{ ...st.td, ...t }}>{u === 'GERAL' ? 'Geral' : <ChipUf uf={u} />}</td>
                        <td style={{ ...tdN, ...t }}>{mil(vol[u].leite)}</td><td style={{ ...tdN, ...t, ...muted }}>{pct(vol[u].leite / vol.GERAL.leite * 100)}</td>
                        <td style={{ ...tdN, ...t }}>{mil(vol[u].kg)}</td><td style={{ ...tdN, ...t, ...muted }}>{pct(vol[u].kg / vol.GERAL.kg * 100)}</td>
                      </tr>) })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RENDIMENTO */}
          <div style={st.card}>
            <div style={st.cardTitle}>Rendimento — litros de leite por kg de queijo</div>
            <div style={st.sub}>Volume de leite/ano dividido pelo volume de queijo/ano, por <b>{rotRend.toLowerCase()}</b> e por estado. Quanto menor o número, mais queijo sai do mesmo leite. Só entram as linhas que têm os dois volumes (leite spot, leite pasteurizado e bebida láctea ficam fora).</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              {[...ufs, 'GERAL'].map(u => {
                const r = u === 'GERAL' ? rendimento(linhas, () => 'GERAL')[0] : rendUf[u]
                return (
                  <div key={u} style={{ flex: 1, minWidth: 120, background: '#f4f6fb', borderRadius: 10, padding: '10px 14px', borderLeft: `4px solid ${u === 'GERAL' ? '#0f1729' : cu(u)}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7a99' }}>{u === 'GERAL' ? 'GERAL' : u}</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{r ? dec2(r.rend) : '—'} <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7a99' }}>L/kg</span></div>
                    <div style={{ fontSize: 10, color: '#9aa6bf' }}>{r ? `${r.n} linhas` : 'sem volumes'}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ maxHeight: 380, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={st.th}>{rotRend}</th><th style={thN}>Linhas</th><th style={thN}>Leite (L/ano)</th><th style={thN}>%</th><th style={thN}>Queijo (kg/ano)</th><th style={thN}>L por kg</th></tr></thead>
                <tbody>
                  {(() => { const totLt = rendPor.reduce((s, o) => s + o.leite, 0); return rendPor.map(o => (
                    <tr key={o.cat}>
                      <td style={{ ...st.td, fontWeight: 600 }}>{o.cat}</td>
                      <td style={{ ...tdN, ...muted }}>{o.n}</td>
                      <td style={tdN}>{mil(o.leite)}</td><td style={{ ...tdN, ...muted }}>{pct(o.leite / totLt * 100)}</td>
                      <td style={tdN}>{mil(o.kg)}</td>
                      <td style={{ ...tdN, fontWeight: 800 }}>{dec2(o.rend)}</td>
                    </tr>)) })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* DISTRIBUIDORES */}
          <div style={st.card}>
            <div style={st.cardTitle}>Distribuidores por estado</div>
            <div style={st.sub}>Quem atende cada linha. {categoria === 'cultura' && <><b>Sem cultura comercial</b> são os laticínios que fazem soro fermento, vendem leite spot ou produzem sem o insumo. </>}<b>Não informado</b> é o que veio em branco na planilha.</div>
            <TabelaUf dados={tabelaUf(linhas, rotulo.distribuidor)} ufs={ufs} titulo="Distribuidor" />
          </div>

          {/* MARCA (enzima) / CULTURA USADA (cultura) */}
          <div style={st.card}>
            <div style={st.cardTitle}>{categoria === 'enzima' ? 'Marcas por estado' : 'Culturas usadas por estado'}</div>
            <div style={st.sub}>{categoria === 'enzima' ? 'Qual marca de coagulante cada linha usa, em número e em porcentagem.' : 'A apresentação da cultura declarada em cada linha, em número e em porcentagem.'}</div>
            <TabelaUf dados={tabelaUf(linhas, categoria === 'enzima' ? rotulo.marca : rotulo.apresentacao)} ufs={ufs} titulo={categoria === 'enzima' ? 'Marca' : 'Cultura (apresentação)'} />
          </div>
        </div>
      )}
    </div>
  )
}
