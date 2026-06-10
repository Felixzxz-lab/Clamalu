import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Layout({ children, user, titulo }) {
  const router = useRouter()
  const pagina = router.pathname.split('/').pop()

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const paginas = user?.paginas || []

  return (
    <>
      <Head><title>Clamalu · {titulo}</title></Head>
      <div style={{ minHeight: '100vh', background: '#f4f6fb', fontFamily: "'Segoe UI',system-ui,sans-serif", fontSize: 13 }}>
        {/* HEADER */}
        <div style={{ background: '#0b2a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 58, boxShadow: '0 2px 12px rgba(0,0,0,0.18)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#0b2a8a' }}>CL</div>
            <div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Clamalu</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Representações · Insumos</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {paginas.includes('vendedor') && (
              <button onClick={() => router.push('/dashboard/vendedor')}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: pagina === 'vendedor' ? 'white' : 'rgba(255,255,255,0.1)', color: pagina === 'vendedor' ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
                Vendedor
              </button>
            )}
            {paginas.includes('produto') && (
              <button onClick={() => router.push('/dashboard/produto')}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: pagina === 'produto' ? 'white' : 'rgba(255,255,255,0.1)', color: pagina === 'produto' ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
                Produto
              </button>
            )}
            {paginas.includes('cliente') && (
              <button onClick={() => router.push('/dashboard/cliente')}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: pagina === 'cliente' ? 'white' : 'rgba(255,255,255,0.1)', color: pagina === 'cliente' ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
                Cliente
              </button>
            )}
            {paginas.includes('comparacao') && (
              <button onClick={() => router.push('/dashboard/comparacao')}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: pagina === 'comparacao' ? 'white' : 'rgba(255,255,255,0.1)', color: pagina === 'comparacao' ? '#0b2a8a' : 'rgba(255,255,255,0.75)' }}>
                Comparação
              </button>
            )}
            {user?.role === 'admin' && (
              <>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 8px', alignSelf: 'center' }} />
                <button onClick={() => router.push('/admin')}
                  style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                  ⚙ Admin
                </button>
              </>
            )}
            <button onClick={sair}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: 'rgba(220,38,38,0.7)', color: 'white', marginLeft: 4 }}>
              Sair
            </button>
          </div>
        </div>
        {children}
      </div>
    </>
  )
}
