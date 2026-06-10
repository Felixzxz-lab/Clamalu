import { useState, useRef, useEffect } from 'react'

export const ANOS_OPC = ['2024', '2025', '2026']
export const VEND_OPC = ['THIAGO', 'WENDEL', 'CLEBER', 'CLAMALU']
export const MESES_OPC = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  .map((m, i) => ({ value: String(i + 1), label: m }))

// Lista suspensa com caixas de seleção (multi-seleção). value é um array de strings.
export function MultiSelect({ label, options, value, onChange, accent = '#e2e6f0', minWidth = 130 }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const opts = options.map(o => (typeof o === 'object' ? o : { value: String(o), label: String(o) }))
  const sel = value.map(String)
  const toggle = (v) => onChange(sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v])
  const resumo = sel.length === 0 ? 'Todos'
    : sel.length === 1 ? (opts.find(o => o.value === sel[0])?.label ?? sel[0])
    : `${sel.length} selecionados`

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{ border: `1.5px solid ${accent}`, borderRadius: 8, padding: '6px 26px 6px 10px', fontSize: 12, fontWeight: 500, background: '#f4f6fb', color: sel.length ? '#0f1729' : '#6b7a99', cursor: 'pointer', minWidth, textAlign: 'left', position: 'relative', whiteSpace: 'nowrap' }}>
        {resumo}
        <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#6b7a99' }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 300, marginTop: 4, background: 'white', border: '1px solid #e2e6f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 6, minWidth: minWidth + 30, maxHeight: 280, overflowY: 'auto' }}>
          {sel.length > 0 && (
            <div onClick={() => onChange([])} style={{ fontSize: 11, color: '#dc2626', cursor: 'pointer', padding: '5px 8px', fontWeight: 600, borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>✕ Limpar seleção</div>
          )}
          {opts.map(o => {
            const on = sel.includes(o.value)
            return (
              <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 6, background: on ? '#e8eeff' : 'transparent' }}>
                <input type="checkbox" checked={on} onChange={() => toggle(o.value)} />
                <span style={{ color: '#0f1729', fontWeight: on ? 600 : 500 }}>{o.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
