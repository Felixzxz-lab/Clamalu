import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { parse } from 'cookie'
import { verifyToken } from '../lib/auth'
import { corVendedor, COR_SEGMENTO } from '../lib/cores'
import { COR_UFS } from '../components/ParticipacaoUf'

// Apresentação semanal (pedido do Romulo: sair do PowerPoint). Monta os slides
// com os números do dashboard para a reunião com a equipe ou com a diretoria.
// Cada slide tem 1280×720 (16:9, o mesmo tamanho do PowerPoint); na tela é
// escalado, no PDF (Imprimir) sai um slide por página.

const W = 1280, H = 720
const AZUL = '#0b2a8a', AZUL2 = '#1341c4', VERDE = '#0f7a4d', VERMELHO = '#b42318', CINZA = '#6b7a99'
const cu = uf => COR_UFS[uf] || '#9ca3af'
const brl = v => { if (v == null) return '—'; const a = Math.abs(v); const s = a >= 1e6 ? (a / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi' : a >= 1e3 ? Math.round(a / 1e3).toLocaleString('pt-BR') + ' mil' : Math.round(a).toLocaleString('pt-BR'); return (v < 0 ? '−' : '') + 'R$ ' + s }
const pct = (v, casas = 1) => v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%'
const sinal = v => v == null ? '' : v >= 0 ? '+' : '−'
const cortar = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s }

function Var({ v, grande }) {
  if (v == null) return <span style={{ color: CINZA, fontSize: grande ? 22 : 13 }}>novo</span>
  const cor = v >= 0 ? VERDE : VERMELHO
  return <span style={{ color: cor, fontWeight: 800, fontSize: grande ? 22 : 13, whiteSpace: 'nowrap' }}>{v >= 0 ? '▲' : '▼'} {pct(Math.abs(v))}</span>
}

// ---------- moldura de slide ----------
function Slide({ titulo, kicker, children, n, total, periodo, rodape = true }) {
  return (
    <div style={{ width: W, height: H, background: 'white', position: 'relative', overflow: 'hidden', fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f1729' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: AZUL }} />
      <div style={{ padding: '44px 64px 0 70px' }}>
        {kicker && <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: AZUL2, marginBottom: 8 }}>{kicker}</div>}
        <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.6, maxWidth: 1100 }}>{titulo}</div>
      </div>
      <div style={{ position: 'absolute', left: 70, right: 64, top: 170, bottom: 64 }}>{children}</div>
      {rodape && (
        <div style={{ position: 'absolute', left: 70, right: 64, bottom: 22, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9aa6bf' }}>
          <span><b style={{ color: AZUL }}>Clamalu</b> · Representações · Insumos · {periodo?.rotuloMes}</span>
          <span>{n} / {total}</span>
        </div>
      )}
    </div>
  )
}

function Kpi({ rotulo, valor, detalhe, cor = '#0f1729' }) {
  return (
    <div style={{ flex: 1, background: '#f4f6fb', borderRadius: 16, padding: '26px 28px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: CINZA, textTransform: 'uppercase', letterSpacing: 0.8 }}>{rotulo}</div>
      <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1.5, color: cor, margin: '8px 0 6px', lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 16, color: '#3d4864' }}>{detalhe}</div>
    </div>
  )
}

function Rosca({ itens, tamanho = 220 }) {
  let a = 0
  const g = itens.map(u => { const s = `${cu(u.uf)} ${a}% ${a + u.pct}%`; a += u.pct; return s }).join(',')
  return <div style={{ width: tamanho, height: tamanho, borderRadius: '50%', background: `conic-gradient(${g || '#eee 0 100%'})`, position: 'relative', flexShrink: 0 }}>
    <div style={{ position: 'absolute', inset: tamanho * 0.23, background: 'white', borderRadius: '50%' }} />
  </div>
}

function ListaUf({ itens }) {
  return <div style={{ flex: 1 }}>{itens.map(u => (
    <div key={u.uf} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, marginBottom: 10 }}>
      <i style={{ width: 14, height: 14, borderRadius: 3, background: cu(u.uf), display: 'inline-block' }} />
      <b style={{ width: 40 }}>{u.uf}</b>
      <span style={{ flex: 1, color: CINZA }}>{brl(u.valor)}</span>
      <b>{pct(u.pct)}</b>
    </div>))}</div>
}

// ---------- os slides ----------
// publico: em quais modelos o slide vem ligado por padrão
const SLIDES = [
  { id: 'capa', nome: 'Capa', publico: ['equipe', 'diretoria'], render: (d, ctx) => (
    <div style={{ width: W, height: H, background: `linear-gradient(135deg, ${AZUL} 0%, ${AZUL2} 100%)`, color: 'white', position: 'relative', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -120, top: -120, width: 520, height: 520, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', right: 80, bottom: -160, width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ padding: '90px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', color: AZUL, fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>CL</div>
          <div><div style={{ fontSize: 26, fontWeight: 700 }}>Clamalu</div><div style={{ fontSize: 16, opacity: 0.6 }}>Representações · Insumos</div></div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.65, marginTop: 120 }}>{ctx.publico === 'diretoria' ? 'Reunião de diretoria' : 'Reunião da equipe comercial'}</div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginTop: 14 }}>Resultado comercial<br />{d.periodo.rotuloMes}</div>
        <div style={{ fontSize: 22, opacity: 0.75, marginTop: 24 }}>Acumulado {d.periodo.rotuloAcum} · comparado com o mesmo período de {d.periodo.ano - 1}</div>
      </div>
    </div>
  ) },

  { id: 'resumo', nome: 'Resumo do período', publico: ['equipe', 'diretoria'], titulo: d => {
      const r = d.resumo
      return r.varAcum == null ? `Faturamento de ${brl(r.acum)} no acumulado do ano`
        : `O ano acumula ${brl(r.acum)}, ${pct(Math.abs(r.varAcum))} ${r.varAcum >= 0 ? 'acima' : 'abaixo'} do mesmo período de ${d.periodo.ano - 1}`
    }, kicker: 'Resumo', render: d => {
      const r = d.resumo
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, height: '100%' }}>
          <div style={{ display: 'flex', gap: 22 }}>
            <Kpi rotulo={`Faturamento ${d.periodo.rotuloMes}`} valor={brl(r.mes)} detalhe={<><Var v={r.varMes} /> sobre {d.periodo.rotuloMesAnt} · <Var v={r.varMesPrev} /> sobre {d.periodo.rotuloMesPrev}</>} />
            <Kpi rotulo={`Acumulado ${d.periodo.rotuloAcum}`} valor={brl(r.acum)} detalhe={<><Var v={r.varAcum} /> sobre {d.periodo.rotuloAcumAnt} ({brl(r.acumAnt)})</>} cor={AZUL2} />
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <Kpi rotulo={`Clientes em ${d.periodo.rotuloMes}`} valor={r.clientesMes.toLocaleString('pt-BR')} detalhe="compraram no mês" />
            <Kpi rotulo="Clientes no ano" valor={r.clientesAcum.toLocaleString('pt-BR')} detalhe={`${r.clientesAcumAnt} no mesmo período de ${d.periodo.ano - 1}`} />
            <Kpi rotulo="Produtos vendidos" valor={r.produtosAcum.toLocaleString('pt-BR')} detalhe="no acumulado do ano" />
          </div>
        </div>
      )
    } },

  { id: 'evolucao', nome: 'Evolução mês a mês', publico: ['equipe', 'diretoria'], kicker: 'Evolução mensal',
    titulo: d => { const melhor = d.evolucao.filter(e => e.atual != null).sort((a, b) => b.atual - a.atual)[0]; return `Mês a mês: ${d.periodo.ano} contra ${d.periodo.ano - 1}${melhor ? ` — melhor mês foi ${melhor.mes}, com ${brl(melhor.atual)}` : ''}` },
    render: d => {
      const max = Math.max(...d.evolucao.flatMap(e => [e.atual || 0, e.anterior || 0]), 1)
      const gw = 1146 / 12, bw = 30, ch = 390
      return (
        <svg width="1146" height="486" style={{ overflow: 'visible' }}>
          {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1="0" x2="1146" y1={ch - ch * f} y2={ch - ch * f} stroke="#eef1f7" />)}
          {d.evolucao.map((e, i) => {
            const x = i * gw + gw / 2
            const ha = (e.anterior || 0) / max * ch, hb = (e.atual || 0) / max * ch
            return (
              <g key={e.mes}>
                <rect x={x - bw - 2} y={ch - ha} width={bw} height={ha} rx="4" fill="#c9d3ec" />
                {e.atual != null && <rect x={x + 2} y={ch - hb} width={bw} height={hb} rx="4" fill={AZUL2} />}
                {e.atual != null && <text x={x + 2 + bw / 2} y={ch - hb - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill={AZUL}>{(e.atual / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</text>}
                <text x={x} y={ch + 26} textAnchor="middle" fontSize="16" fontWeight="600" fill="#3d4864">{e.mes}</text>
              </g>
            )
          })}
          <g transform={`translate(0, ${ch + 62})`} fontSize="16" fill="#3d4864">
            <rect width="16" height="16" rx="3" fill="#c9d3ec" /><text x="24" y="13">{d.periodo.ano - 1}</text>
            <rect x="100" width="16" height="16" rx="3" fill={AZUL2} /><text x="124" y="13">{d.periodo.ano}</text>
            <text x="210" y="13" fill={CINZA}>valores em R$ milhões</text>
          </g>
        </svg>
      )
    } },

  { id: 'segmentos', nome: 'Segmentos', publico: ['equipe', 'diretoria'], kicker: 'Segmentos',
    titulo: d => { const c = d.segmentos.find(s => s.segmento === 'Culturas'), e = d.segmentos.find(s => s.segmento === 'Enzimas'); return `Culturas ${c.var == null ? '' : (c.var >= 0 ? 'crescem ' : 'caem ') + pct(Math.abs(c.var))} e Enzimas ${e.var == null ? '' : (e.var >= 0 ? 'crescem ' : 'caem ') + pct(Math.abs(e.var))} no ano` },
    render: d => {
      const max = Math.max(...d.segmentos.flatMap(s => [s.acum, s.acumAnt]), 1)
      return (
        <div style={{ display: 'flex', gap: 24, height: '100%' }}>
          {d.segmentos.map(s => (
            <div key={s.segmento} style={{ flex: 1, borderRadius: 16, background: '#f7f9fd', borderTop: `8px solid ${COR_SEGMENTO[s.segmento]}`, padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#3d4864' }}>{s.segmento}</div>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, margin: '10px 0 2px' }}>{brl(s.acum)}</div>
              <div style={{ fontSize: 17, color: CINZA }}>{pct(s.pct)} do faturamento · <Var v={s.var} /></div>
              <div style={{ marginTop: 'auto' }}>
                {[[d.periodo.ano - 1, s.acumAnt, '#c9d3ec'], [d.periodo.ano, s.acum, COR_SEGMENTO[s.segmento]]].map(([a, v, cor]) => (
                  <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 15 }}>
                    <span style={{ width: 44, color: CINZA }}>{a}</span>
                    <div style={{ flex: 1, height: 18, background: '#eef1f7', borderRadius: 5, overflow: 'hidden' }}><div style={{ width: v / max * 100 + '%', height: '100%', background: cor }} /></div>
                    <span style={{ width: 96, textAlign: 'right', fontWeight: 700 }}>{brl(v)}</span>
                  </div>
                ))}
                <div style={{ fontSize: 14, color: CINZA, marginTop: 14 }}>Em {d.periodo.rotuloMes}: <b style={{ color: '#0f1729' }}>{brl(s.mes)}</b></div>
              </div>
            </div>
          ))}
        </div>
      )
    } },

  { id: 'vendedores', nome: 'Vendedores', publico: ['equipe', 'diretoria'], kicker: 'Vendedores',
    titulo: d => { const v = d.vendedores[0]; return v ? `${v.vendedor} lidera o ano com ${brl(v.acum)} (${pct(v.pct)} do faturamento)` : 'Vendedores' },
    render: d => {
      const todos = d.vendedores.map(v => v.vendedor), max = Math.max(...d.vendedores.map(v => v.acum), 1)
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 18 }}>
          <thead><tr style={{ color: CINZA, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            <th style={{ textAlign: 'left', paddingBottom: 12 }}>Vendedor</th><th style={{ textAlign: 'left', width: '36%' }}>Acumulado por segmento</th>
            <th style={{ textAlign: 'right' }}>Acumulado</th><th style={{ textAlign: 'right' }}>vs {d.periodo.ano - 1}</th><th style={{ textAlign: 'right' }}>{d.periodo.rotuloMes}</th>
          </tr></thead>
          <tbody>{d.vendedores.slice(0, 7).map(v => (
            <tr key={v.vendedor} style={{ borderTop: '1px solid #eef1f7' }}>
              <td style={{ padding: '14px 0', fontWeight: 800 }}><i style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: corVendedor(v.vendedor, todos), marginRight: 10 }} />{v.vendedor}</td>
              <td><div style={{ display: 'flex', height: 22, width: v.acum / max * 100 + '%', borderRadius: 5, overflow: 'hidden', gap: 1 }}>
                {['Culturas', 'Enzimas', 'Outros'].map(s => v[s] > 0 && <div key={s} style={{ flex: v[s], background: COR_SEGMENTO[s] }} />)}</div></td>
              <td style={{ textAlign: 'right', fontWeight: 800 }}>{brl(v.acum)}</td>
              <td style={{ textAlign: 'right' }}><Var v={v.var} /></td>
              <td style={{ textAlign: 'right', color: '#3d4864' }}>{brl(v.mes)}</td>
            </tr>))}</tbody>
          <tfoot><tr><td colSpan={5} style={{ paddingTop: 16, fontSize: 14, color: CINZA }}>
            {['Culturas', 'Enzimas', 'Outros'].map(s => <span key={s} style={{ marginRight: 20 }}><i style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: COR_SEGMENTO[s], marginRight: 6 }} />{s}</span>)}
          </td></tr></tfoot>
        </table>
      )
    } },

  { id: 'produtos', nome: 'Produtos em alta e em queda', publico: ['equipe'], kicker: 'Produtos',
    titulo: d => { const a = d.produtos.cresceram[0], q = d.produtos.cairam[0]; return a && q ? `${cortar(a.produto, 26)} é o que mais cresce; ${cortar(q.produto, 22)} é a maior queda` : 'Produtos em alta e em queda' },
    render: d => (
      <div style={{ display: 'flex', gap: 40 }}>
        {[['▲ Mais cresceram', d.produtos.cresceram, VERDE], ['▼ Mais caíram', d.produtos.cairam, VERMELHO]].map(([t, l, cor]) => (
          <div key={t} style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: cor, marginBottom: 12 }}>{t} <span style={{ fontSize: 14, color: CINZA, fontWeight: 600 }}>· {d.periodo.rotuloAcum} x {d.periodo.ano - 1}</span></div>
            {l.map((p, i) => (
              <div key={p.produto} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: '1px solid #eef1f7', fontSize: 17 }}>
                <span style={{ width: 26, color: CINZA, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ flex: 1 }}><b>{cortar(p.produto, 28)}</b><div style={{ fontSize: 13, color: CINZA }}>{p.segmento} · {brl(p.v0)} → {brl(p.v1)}</div></span>
                <span style={{ textAlign: 'right' }}><b style={{ color: cor }}>{sinal(p.diff)} {brl(Math.abs(p.diff))}</b><div style={{ fontSize: 13 }}><Var v={p.var ?? (p.v1 === 0 ? -100 : null)} /></div></span>
              </div>
            ))}
          </div>
        ))}
      </div>
    ) },

  { id: 'concentracao', nome: 'Concentração de clientes', publico: ['equipe', 'diretoria'], kicker: 'Clientes',
    titulo: d => { const f = Object.fromEntries(d.concentracao.faixas.map(x => [x.faixa, x.clientes])); return `${f[20]} clientes fazem 20% do faturamento; ${f[50]} fazem metade` },
    render: d => (
      <div style={{ display: 'flex', gap: 40, height: '100%' }}>
        <div style={{ width: 330, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {d.concentracao.faixas.map(f => (
            <div key={f.faixa} style={{ background: '#f4f6fb', borderRadius: 14, padding: '18px 22px' }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: AZUL2, lineHeight: 1 }}>{f.clientes}</div>
              <div style={{ fontSize: 16, color: '#3d4864', marginTop: 4 }}>clientes fazem <b>{f.faixa}%</b> do faturamento</div>
            </div>
          ))}
          <div style={{ fontSize: 14, color: CINZA }}>de {d.concentracao.total} clientes que compraram em {d.periodo.rotuloAcum}</div>
        </div>
        <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: 16, alignSelf: 'flex-start' }}>
          <thead><tr style={{ color: CINZA, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}><th style={{ textAlign: 'left', paddingBottom: 8 }}>#</th><th style={{ textAlign: 'left' }}>Maiores clientes do ano</th><th style={{ textAlign: 'right' }}>Faturamento</th><th style={{ textAlign: 'right' }}>%</th><th style={{ textAlign: 'right' }}>Posição</th></tr></thead>
          <tbody>{d.concentracao.top.map(c => { const s = c.posAnt == null ? null : c.posAnt - c.pos; return (
            <tr key={c.cliente} style={{ borderTop: '1px solid #eef1f7' }}>
              <td style={{ padding: '9px 0', fontWeight: 800, color: CINZA }}>{c.pos}</td>
              <td><b>{cortar(c.cliente, 36)}</b> <span style={{ color: CINZA, fontSize: 13 }}>{c.uf}</span></td>
              <td style={{ textAlign: 'right' }}>{brl(c.valor)}</td>
              <td style={{ textAlign: 'right', color: CINZA }}>{pct(c.pct)}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: s == null ? AZUL2 : s > 0 ? VERDE : s < 0 ? VERMELHO : CINZA }}>{s == null ? 'novo' : s > 0 ? `▲ ${s}` : s < 0 ? `▼ ${-s}` : '='}</td>
            </tr>) })}</tbody>
        </table>
      </div>
    ) },

  { id: 'movimentos', nome: 'Clientes em alta e em queda', publico: ['equipe'], kicker: 'Clientes',
    titulo: d => { const q = d.clientes.cairam[0]; return q ? `Maior queda: ${cortar(q.cliente, 30)}, puxada por ${cortar(q.produto, 20)} em ${q.mes}` : 'Clientes em alta e em queda' },
    render: d => (
      <div style={{ display: 'flex', gap: 40 }}>
        {[['▲ Mais cresceram', d.clientes.cresceram, VERDE], ['▼ Mais caíram', d.clientes.cairam, VERMELHO]].map(([t, l, cor]) => (
          <div key={t} style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: cor, marginBottom: 12 }}>{t}</div>
            {l.map(c => (
              <div key={c.cliente} style={{ padding: '12px 0', borderTop: '1px solid #eef1f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17 }}><b>{cortar(c.cliente, 30)}</b><b style={{ color: cor }}>{sinal(c.diff)} {brl(Math.abs(c.diff))}</b></div>
                <div style={{ fontSize: 14, color: CINZA, marginTop: 2 }}>{c.uf} · por causa de <b style={{ color: '#3d4864' }}>{cortar(c.produto, 24)}</b> ({sinal(c.produtoDiff)} {brl(Math.abs(c.produtoDiff))}) · pico em <b style={{ color: '#3d4864' }}>{c.mes}</b></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ) },

  { id: 'estados', nome: 'Estados', publico: ['equipe', 'diretoria'], kicker: 'Estados',
    titulo: d => { const u = d.ufs.acum[0]; return u ? `${u.uf} responde por ${pct(u.pct)} do faturamento do ano` : 'Participação por estado' },
    render: d => (
      <div style={{ display: 'flex', gap: 60 }}>
        {[[d.periodo.rotuloMes + ' — mês fechado', d.ufs.mes], [d.periodo.rotuloAcum + ' — acumulado', d.ufs.acum]].map(([t, l]) => (
          <div key={t} style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#3d4864', marginBottom: 20 }}>{t}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}><Rosca itens={l} /><ListaUf itens={l} /></div>
          </div>
        ))}
      </div>
    ) },

  { id: 'radar', nome: 'Oportunidades de recuperação', publico: ['equipe'], kicker: 'Oportunidades',
    titulo: d => `${d.radar.clientes} clientes pararam de comprar produtos que compravam em ${d.periodo.ano - 1} — ${brl(d.radar.total)} em jogo`,
    render: d => (
      <div>
        <div style={{ fontSize: 17, color: '#3d4864', marginBottom: 16 }}>Clientes que compraram o produto em {d.periodo.rotuloAcumAnt} e não compraram nada dele em {d.periodo.rotuloAcum}. Os maiores:</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 17 }}>
          <thead><tr style={{ color: CINZA, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}><th style={{ textAlign: 'left', paddingBottom: 8 }}>Cliente</th><th style={{ textAlign: 'left' }}>Produto que parou</th><th style={{ textAlign: 'right' }}>Comprava em {d.periodo.ano - 1}</th></tr></thead>
          <tbody>{d.radar.top.map(z => (
            <tr key={z.cliente + z.produto} style={{ borderTop: '1px solid #eef1f7' }}>
              <td style={{ padding: '12px 0' }}><b>{cortar(z.cliente, 40)}</b> <span style={{ color: CINZA, fontSize: 13 }}>{z.uf}</span></td>
              <td>{cortar(z.produto, 30)}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: VERMELHO }}>{brl(z.v0)}</td>
            </tr>))}</tbody>
        </table>
        <div style={{ fontSize: 14, color: CINZA, marginTop: 14 }}>Ao todo, {d.radar.pares} combinações de cliente e produto. A lista completa está na tela Comparação do dashboard.</div>
      </div>
    ) },

  { id: 'presenca', nome: 'Presença Clamalu por estado', publico: ['equipe', 'diretoria'], kicker: 'Mercado mapeado', so: d => d.mercado?.length > 0,
    titulo: d => 'Presença da Clamalu: ' + d.mercado.map((m, i) => `${pct(m.share.GERAL.pctLinhas)}${i ? '' : ' das produções'} em ${m.curto}`).join(' e '),
    render: d => {
      const ufs = [...new Set(d.mercado.flatMap(m => Object.keys(m.share).filter(k => k !== 'GERAL')))].sort()
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', gap: 30, paddingLeft: 110, marginBottom: 6 }}>
            {d.mercado.map(m => <div key={m.categoria} style={{ flex: 1, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#3d4864' }}>{m.nome}</div>)}
          </div>
          {[...ufs, 'GERAL'].map(u => (
            <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '18px 0', borderTop: `${u === 'GERAL' ? 2 : 1}px solid ${u === 'GERAL' ? '#c9d3ec' : '#eef1f7'}` }}>
              <div style={{ width: 80, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                {u !== 'GERAL' && <i style={{ width: 14, height: 14, borderRadius: 3, background: cu(u), display: 'inline-block' }} />}{u === 'GERAL' ? 'Geral' : u}
              </div>
              {d.mercado.map(m => { const s = m.share[u]; return (
                <div key={m.categoria} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                  {s ? <>
                    <div style={{ width: 118, fontSize: 38, fontWeight: 800, letterSpacing: -1, color: u === 'GERAL' ? AZUL : '#0f1729' }}>{pct(s.pctLinhas)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 14, background: '#eef1f7', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: s.pctLinhas + '%', height: '100%', background: u === 'GERAL' ? AZUL : cu(u) }} /></div>
                      <div style={{ fontSize: 14, color: CINZA, marginTop: 5 }}>{s.linhasCla} de {s.linhas} produções · <b style={{ color: '#3d4864' }}>{pct(s.pctLt)}</b> do leite</div>
                    </div>
                  </> : <span style={{ color: CINZA }}>sem dados</span>}
                </div>) })}
            </div>
          ))}
          <div style={{ fontSize: 14, color: CINZA, marginTop: 'auto' }}>Produção = um laticínio fazendo um tipo de queijo (quem faz Mussarela e Prato conta 2). O % é a parte dessas produções que usa o insumo da Clamalu, sobre todo o mercado levantado — clientes e não clientes.</div>
        </div>
      )
    } },

  ...['cultura', 'enzima'].map(categoria => ({
    id: 'mercado-' + categoria, nome: categoria === 'cultura' ? 'Mercado de Culturas' : 'Mercado de Enzimas', publico: ['equipe', 'diretoria'], kicker: 'Mercado mapeado',
    so: d => d.mercado?.some(m => m.categoria === categoria),
    titulo: d => { const m = d.mercado.find(x => x.categoria === categoria), g = m.share.GERAL; return `${m.curto}: a Clamalu fornece ${m.insumo === 'cultura' ? 'a cultura' : 'o coagulante'} de ${g.linhasCla} das ${g.linhas} produções mapeadas` },
    render: d => {
      const m = d.mercado.find(x => x.categoria === categoria), g = m.share.GERAL
      const Ranking = ({ titulo, itens }) => {
        const max = Math.max(...itens.map(i => i.n), 1)
        return (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: CINZA, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>{titulo}</div>
            {itens.map(i => { const cla = i.cat === 'Clamalu', fraco = /^(Sem|Não informado)/.test(i.cat); return (
              <div key={i.cat} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9, fontSize: 16 }}>
                <span style={{ width: 190, fontWeight: cla ? 800 : 600, color: fraco ? CINZA : '#0f1729' }}>{cortar(i.cat, 22)}</span>
                <div style={{ flex: 1, height: 18, background: '#eef1f7', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: i.n / max * 100 + '%', height: '100%', background: cla ? AZUL2 : fraco ? '#dfe4ef' : '#a9b6d6' }} /></div>
                <span style={{ width: 40, textAlign: 'right', fontWeight: 800 }}>{i.n}</span>
                <span style={{ width: 58, textAlign: 'right', color: CINZA }}>{pct(i.n / g.linhas * 100)}</span>
              </div>) })}
          </div>
        )
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <Kpi rotulo="Laticínios" valor={m.cli.GERAL.empresas} detalhe="mapeados" />
            <Kpi rotulo="Produções de queijo" valor={g.linhas} detalhe="laticínio × tipo de queijo" />
            <Kpi rotulo="Usam Clamalu" valor={pct(g.pctLinhas)} detalhe={`${g.linhasCla} produções com ${m.insumo} Clamalu`} cor={AZUL2} />
            <Kpi rotulo="Do leite é Clamalu" valor={pct(g.pctLt)} detalhe="do volume processado" cor="#5b7be8" />
          </div>
          <div style={{ display: 'flex', gap: 50 }}>
            <Ranking titulo="Quem fornece" itens={m.distribuidores} />
            <Ranking titulo={categoria === 'enzima' ? 'Marcas mais usadas' : 'Culturas mais usadas'} itens={m.usados} />
          </div>
        </div>
      )
    } })),

  { id: 'pauta', nome: 'Pontos para discussão', publico: ['equipe', 'diretoria'], kicker: 'Para discutir', titulo: () => 'Pontos para discussão',
    render: (d, ctx) => (
      <div style={{ display: 'flex', gap: 40, height: '100%' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: CINZA, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Destaques dos números</div>
          {destaques(d).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, fontSize: 19, lineHeight: 1.4, marginBottom: 16 }}><span style={{ color: AZUL2, fontWeight: 800 }}>●</span><span>{t}</span></div>
          ))}
        </div>
        <div style={{ flex: 1, background: '#fbfaf3', border: '1.5px dashed #e3d9a8', borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#8a7a3e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Pauta da reunião</div>
          <div contentEditable={ctx.editavel} suppressContentEditableWarning spellCheck={false}
            onBlur={e => ctx.salvarPauta(e.currentTarget.innerText)}
            style={{ fontSize: 19, lineHeight: 1.5, whiteSpace: 'pre-wrap', minHeight: 300, outline: 'none', color: ctx.pauta ? '#0f1729' : '#b3a878' }}>
            {ctx.pauta || (ctx.editavel ? <span className="nao-imprime">Clique aqui e escreva os pontos da reunião…</span> : '')}
          </div>
        </div>
      </div>
    ) },
]

function destaques(d) {
  const out = [], r = d.resumo
  if (r.varAcum != null) out.push(`Ano ${r.varAcum >= 0 ? 'acima' : 'abaixo'} de ${d.periodo.ano - 1}: ${brl(r.acum)} contra ${brl(r.acumAnt)} (${sinal(r.varAcum)}${pct(Math.abs(r.varAcum))}).`)
  const segs = [...d.segmentos].filter(s => s.var != null).sort((a, b) => Math.abs(b.acum - b.acumAnt) - Math.abs(a.acum - a.acumAnt))
  if (segs[0]) out.push(`${segs[0].segmento} foi o segmento que mais mudou: ${sinal(segs[0].acum - segs[0].acumAnt)} ${brl(Math.abs(segs[0].acum - segs[0].acumAnt))} no ano.`)
  const q = d.clientes.cairam[0]
  if (q) out.push(`Maior queda de cliente: ${cortar(q.cliente, 32)} (${sinal(q.diff)} ${brl(Math.abs(q.diff))}), principalmente em ${cortar(q.produto, 22)}.`)
  if (d.mercado?.length) out.push(`Presença no mercado mapeado: ${d.mercado.map(m => `${pct(m.share.GERAL.pctLinhas)} das produções em ${m.curto}`).join(' e ')}.`)
  if (d.radar.pares) out.push(`${d.radar.clientes} clientes deixaram de comprar algum produto do ano passado — ${brl(d.radar.total)} para recuperar.`)
  return out
}

// ---------- página ----------
export default function Apresentacao({ user }) {
  const router = useRouter()
  const [meses, setMeses] = useState([])
  const [pedido, setPedido] = useState(null) // 'ano-mes' escolhido no seletor; null = último mês com venda
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [publico, setPublico] = useState('equipe')
  const [ligados, setLigados] = useState(() => SLIDES.filter(s => s.publico.includes('equipe')).map(s => s.id))
  const [modo, setModo] = useState('montar') // 'montar' | 'apresentar'
  const [atual, setAtual] = useState(0)
  const [escala, setEscala] = useState(1)
  const [pauta, setPauta] = useState('')
  const listaRef = useRef(null)

  useEffect(() => {
    const [a, m] = (pedido || '').split('-')
    setDados(null)
    fetch('/api/dados/apresentacao' + (pedido ? `?ano=${a}&mes=${m}` : '')).then(async r => {
      if (r.status === 401) { router.push('/'); return }
      const d = await r.json()
      if (!r.ok) { setErro(d.error || 'Erro ao carregar'); return }
      setMeses(d.meses); setDados(d.dados)
    }).catch(e => setErro(e.message))
  }, [pedido])
  const ref = dados ? `${dados.periodo.ano}-${dados.periodo.mes}` : (pedido || '')

  // pauta fica guardada neste navegador, por mês de referência e público
  const chavePauta = dados ? `clamalu-pauta-${dados.periodo.ano}-${dados.periodo.mes}-${publico}` : null
  useEffect(() => { if (!chavePauta) return; try { setPauta(localStorage.getItem(chavePauta) || '') } catch { setPauta('') } }, [chavePauta])
  const salvarPauta = t => { const v = t.trim(); setPauta(v); try { localStorage.setItem(chavePauta, v) } catch {} }

  function trocarPublico(p) { setPublico(p); setLigados(SLIDES.filter(s => s.publico.includes(p)).map(s => s.id)) }

  const visiveis = dados ? SLIDES.filter(s => ligados.includes(s.id) && (!s.so || s.so(dados))) : []

  // escala do palco: no modo apresentar ocupa a tela; no montar, a largura da coluna
  const medir = useCallback(() => {
    if (modo === 'apresentar') setEscala(Math.min(window.innerWidth / W, window.innerHeight / H))
    else if (listaRef.current) setEscala(Math.min(1, (listaRef.current.clientWidth - 40) / W)) // 40 = padding da coluna
  }, [modo])
  useEffect(() => { medir(); window.addEventListener('resize', medir); return () => window.removeEventListener('resize', medir) }, [medir, dados])

  useEffect(() => {
    if (modo !== 'apresentar') return
    const tecla = e => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); setAtual(i => Math.min(i + 1, visiveis.length - 1)) }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); setAtual(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Home') setAtual(0)
      else if (e.key === 'End') setAtual(visiveis.length - 1)
      else if (e.key === 'Escape') sair()
    }
    const fs = () => { if (!document.fullscreenElement) setModo('montar') }
    window.addEventListener('keydown', tecla); document.addEventListener('fullscreenchange', fs)
    return () => { window.removeEventListener('keydown', tecla); document.removeEventListener('fullscreenchange', fs) }
  }, [modo, visiveis.length])

  function apresentar(i = 0) { setAtual(i); setModo('apresentar'); document.documentElement.requestFullscreen?.().catch(() => {}) }
  function sair() { setModo('montar'); if (document.fullscreenElement) document.exitFullscreen?.() }

  const ctx = { publico, pauta, salvarPauta, editavel: modo === 'montar' }
  const renderSlide = (s, i) => s.id === 'capa' ? s.render(dados, ctx)
    : <Slide titulo={s.titulo(dados)} kicker={s.kicker} n={i + 1} total={visiveis.length} periodo={dados.periodo}>{s.render(dados, ctx)}</Slide>

  const btn = (ativo) => ({ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${ativo ? AZUL2 : '#e2e6f0'}`, background: ativo ? AZUL2 : 'white', color: ativo ? 'white' : '#3d4864', fontSize: 13, fontWeight: 700, cursor: 'pointer' })

  if (modo === 'apresentar' && dados && visiveis[atual]) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0b1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => { const x = e.clientX / window.innerWidth; setAtual(i => x > 0.3 ? Math.min(i + 1, visiveis.length - 1) : Math.max(i - 1, 0)) }}>
        <Head><title>Clamalu · Apresentação</title></Head>
        <div style={{ width: W * escala, height: H * escala }}>
          <div style={{ width: W, height: H, transform: `scale(${escala})`, transformOrigin: 'top left' }}>{renderSlide(visiveis[atual], atual)}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); sair() }} style={{ position: 'fixed', top: 12, right: 12, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>✕ Sair (Esc)</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#eef1f7', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <Head><title>Clamalu · Apresentação</title></Head>
      <style>{`
        @page { size: 13.333in 7.5in; margin: 0 }
        body { margin: 0 }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact }
        @media print {
          .nao-imprime { display: none !important }
          body, .fundo { background: white !important }
          .lista { padding: 0 !important; max-width: none !important }
          .slide-caixa { width: ${W}px !important; height: ${H}px !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important }
          .slide-bloco { break-after: page }
          .slide-bloco:last-child { break-after: auto }
          .slide-escala { transform: none !important }
          .slide-rotulo { display: none !important }
        }
      `}</style>

      <div className="nao-imprime" style={{ position: 'sticky', top: 0, zIndex: 10, background: AZUL, color: 'white', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <button onClick={() => router.back()} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Dashboard</button>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Apresentação da semana</div>
        <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.7 }}>Mês de referência</label>
        <select value={ref} onChange={e => setPedido(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600 }}>
          {meses.map(m => <option key={m.ano + '-' + m.mes} value={m.ano + '-' + m.mes}>{m.rotulo}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['equipe', 'Equipe'], ['diretoria', 'Diretoria']].map(([id, nome]) => (
            <button key={id} onClick={() => trocarPublico(id)} style={{ ...btn(publico === id), borderColor: publico === id ? 'white' : 'rgba(255,255,255,0.3)', background: publico === id ? 'white' : 'transparent', color: publico === id ? AZUL : 'white' }}>{nome}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button disabled={!dados} onClick={() => window.print()} style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>⬇ Salvar PDF</button>
          <button disabled={!dados} onClick={() => apresentar(0)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>▶ Apresentar</button>
        </div>
      </div>

      <div className="fundo" style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div className="nao-imprime" style={{ width: 260, padding: '20px 16px 20px 28px', position: 'sticky', top: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: CINZA, marginBottom: 10 }}>Slides</div>
          {SLIDES.map(s => {
            const indisponivel = dados && s.so && !s.so(dados)
            return (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0', color: indisponivel ? '#b0b8cc' : '#0f1729', cursor: indisponivel ? 'not-allowed' : 'pointer' }}>
                <input type="checkbox" disabled={indisponivel} checked={ligados.includes(s.id) && !indisponivel} onChange={() => setLigados(l => l.includes(s.id) ? l.filter(x => x !== s.id) : [...l, s.id])} />
                {s.nome}
              </label>
            )
          })}
          <div style={{ fontSize: 12, color: CINZA, marginTop: 14, lineHeight: 1.5 }}>
            <b>Equipe</b> traz os detalhes do dia a dia (produtos, clientes, oportunidades). <b>Diretoria</b> fica no resumo, segmentos, vendedores e estados. Os slides de mercado (Culturas, Enzimas e presença por estado) entram nos dois.<br /><br />
            Apresentando: <b>→</b> ou clique avança, <b>←</b> volta, <b>Esc</b> sai. A pauta do último slide é editável aqui e fica salva neste computador.
          </div>
        </div>

        <div ref={listaRef} className="lista" style={{ flex: 1, padding: '20px 28px 60px 12px', maxWidth: 1180 }}>
          {erro && <div style={{ padding: 40, color: '#dc2626' }}>{erro}</div>}
          {!erro && !dados && <div style={{ padding: 40, color: CINZA }}>Montando a apresentação…</div>}
          {dados && visiveis.map((s, i) => (
            <div key={s.id} className="slide-bloco">
              <div className="slide-rotulo" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: CINZA, margin: '0 0 6px 2px' }}>
                <span><b>{i + 1}.</b> {s.nome}</span>
                <button onClick={() => apresentar(i)} style={{ border: 'none', background: 'none', color: AZUL2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>▶ apresentar daqui</button>
              </div>
              <div className="slide-caixa" style={{ width: W * escala, height: H * escala, marginBottom: 24, boxShadow: '0 4px 18px rgba(11,42,138,0.12)', borderRadius: 6, overflow: 'hidden' }}>
                <div className="slide-escala" style={{ width: W, height: H, transform: `scale(${escala})`, transformOrigin: 'top left' }}>{renderSlide(s, i)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps({ req }) {
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (!user) return { redirect: { destination: '/', permanent: false } }
  if (!['vendedor', 'produto', 'cliente', 'comparacao'].some(p => user.paginas?.includes(p)))
    return { redirect: { destination: '/dashboard/' + (user.paginas?.[0] || ''), permanent: false } }
  return { props: { user } }
}
