import { Doughnut } from 'react-chartjs-2'
import { fade, contribui } from '../lib/realce'

// Participação de cada estado no faturamento: rosca + tabela.
// Usado em Produto e Cliente, uma vez para o mês fechado e outra para o acumulado.
// `lista` vem de somaPor(linhas, 'uf') (lib/periodo.js); `linhas` e `sel` são do realce.
export const COR_UFS = { GO:'#1341c4',MT:'#16a34a',PA:'#dc2626',TO:'#ea8c00',RO:'#7c3aed',DF:'#0891b2' }
const cor = uf => COR_UFS[uf] || '#9ca3af'

function fmtVal(v){if(!v)return'—';if(v>=1e6)return'R$ '+(v/1e6).toFixed(2).replace('.',',')+' Mi';if(v>=1e3)return'R$ '+(v/1e3).toFixed(0)+' Mil';return'R$ '+Math.round(v)}
const fmtPct = v => v.toFixed(1).replace('.', ',') + '%'

export function ParticipacaoUf({ titulo, sub, lista, linhas, sel, onPick }) {
  const data = {
    labels: lista.map(u => u.chave),
    datasets: [{
      data: lista.map(u => u.pct),
      backgroundColor: lista.map(u => contribui(linhas, 'uf', u.chave, sel) ? cor(u.chave) : fade(cor(u.chave))),
      borderWidth: 3, borderColor: '#fff',
    }],
  }
  const opts = {
    cutout: '55%', responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${fmtPct(c.raw)}` } } },
    onClick: (e, els) => { if (els.length) onPick('uf', lista[els[0].index].chave) },
  }
  const isSel = uf => sel && sel.dim === 'uf' && sel.value === uf
  return (
    <div style={{ background:'white',borderRadius:12,boxShadow:'0 2px 8px rgba(19,65,196,0.08)',border:'1px solid #e2e6f0',padding:'18px 20px' }}>
      <div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99' }}>{titulo}</div>
      <div style={{ fontSize:11,color:'#9aa6bf',margin:'4px 0 14px' }}>{sub} · clique p/ realçar</div>
      {lista.length === 0 ? <div style={{ fontSize:12,color:'#9aa6bf' }}>Sem vendas no período.</div> : (
        <div style={{ display:'flex',alignItems:'center',gap:18 }}>
          <div style={{ width:140,height:140,flexShrink:0 }}><Doughnut data={data} options={opts} /></div>
          <table style={{ flex:1,borderCollapse:'collapse' }}>
            <tbody>
              {lista.map(u => (
                <tr key={u.chave} onClick={() => onPick('uf', u.chave)} style={{ cursor:'pointer',opacity:contribui(linhas,'uf',u.chave,sel)?1:0.4 }}>
                  <td style={{ padding:'4px 6px',fontSize:12,fontWeight:isSel(u.chave)?800:600 }}>
                    <span style={{ display:'inline-block',width:10,height:10,borderRadius:2,background:cor(u.chave),marginRight:7 }} />{u.chave}
                  </td>
                  <td style={{ padding:'4px 6px',fontSize:11,color:'#6b7a99',textAlign:'right' }}>{fmtVal(u.valor)}</td>
                  <td style={{ padding:'4px 6px',fontSize:12,fontWeight:700,color:'#1341c4',textAlign:'right' }}>{fmtPct(u.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
