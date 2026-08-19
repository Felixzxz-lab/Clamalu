import { fade } from '../lib/realce'

// Faixa de aviso de realce ativo
export function RealceBanner({ sel, onClear }) {
  if (!sel) return null
  return (
    <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '8px 28px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#9a3412' }}>
      <span>🔦 Realçando <strong>{sel.value}</strong> <span style={{ color: '#b45309' }}>({sel.dim})</span> nos gráficos. Os dados não foram filtrados.</span>
      <button onClick={onClear} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: '1px solid #fdba74', background: 'white', color: '#9a3412', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕ Limpar realce</button>
    </div>
  )
}

// Barra horizontal (HTML) com realce em duas partes: realçado (forte) + restante (esmaecido)
export function BarraHL({ nome, total, hi, max, cor, direita, onClick, larguraNome = 64 }) {
  const totalPct = max > 0 ? (total / max * 100) : 0
  const hiFrac = total > 0 ? Math.min(1, hi / total) : 0
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ width: larguraNome, fontSize: 12, fontWeight: 700, textAlign: 'right', color: '#374151' }}>{nome}</div>
      <div style={{ flex: 1, height: 22, background: '#f4f6fb', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: totalPct + '%', height: '100%', display: 'flex', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: (hiFrac * 100) + '%', height: '100%', background: cor }} />
          <div style={{ flex: 1, height: '100%', background: fade(cor) }} />
        </div>
      </div>
      <div style={{ width: 110, fontSize: 11, color: '#6b7a99', textAlign: 'right' }}>{direita}</div>
    </div>
  )
}
