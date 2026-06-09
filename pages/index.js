import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.error || 'Erro ao entrar'); setLoading(false); return }
      if (d.role === 'admin') router.push('/admin')
      else router.push('/dashboard/vendedor')
    } catch {
      setErro('Erro de conexão')
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Clamalu · Acesso</title></Head>
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0b2a8a 0%,#1341c4 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        <div style={{background:'white',borderRadius:16,padding:'40px 36px',width:'100%',maxWidth:380,boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28,justifyContent:'center'}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'#0b2a8a',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'white'}}>CL</div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:'#0b2a8a'}}>Clamalu</div>
              <div style={{fontSize:11,color:'#6b7a99'}}>Representações · Insumos</div>
            </div>
          </div>
          <h2 style={{fontSize:15,fontWeight:700,color:'#0f1729',marginBottom:20,textAlign:'center'}}>Acesse seu dashboard</h2>
          <form onSubmit={entrar}>
            <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',display:'block',marginBottom:5}}>E-mail</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="seu@email.com" required
              style={{width:'100%',border:'1.5px solid #e2e6f0',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#0f1729',outline:'none',marginBottom:14,boxSizing:'border-box'}} />
            <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'#6b7a99',display:'block',marginBottom:5}}>Senha</label>
            <input value={senha} onChange={e=>setSenha(e.target.value)} type="password" placeholder="••••••••" required
              style={{width:'100%',border:'1.5px solid #e2e6f0',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#0f1729',outline:'none',marginBottom:14,boxSizing:'border-box'}} />
            {erro && <p style={{color:'#dc2626',fontSize:12,textAlign:'center',marginBottom:10}}>{erro}</p>}
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:11,borderRadius:8,border:'none',background: loading?'#6b7a99':'#1341c4',color:'white',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer'}}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ req }) {
  const { parse } = await import('cookie')
  const { verifyToken } = await import('../lib/auth')
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (user) return { redirect: { destination: user.role === 'admin' ? '/admin' : '/dashboard/vendedor', permanent: false } }
  return { props: {} }
}
