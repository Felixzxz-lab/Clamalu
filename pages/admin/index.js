import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const PAGINAS = ['vendedor','produto','cliente','comparacao']

export default function Admin({ user }) {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState([])
  const [uploads, setUploads] = useState([])
  const [aba, setAba] = useState('usuarios')
  const [form, setForm] = useState({ nome:'', email:'', senha:'', role:'cliente', paginas:['vendedor','produto','cliente','comparacao'] })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef()

  useEffect(() => { carregarUsuarios(); carregarUploads() }, [])

  async function carregarUsuarios() {
    const r = await fetch('/api/admin/usuarios')
    if (r.ok) setUsuarios(await r.json())
  }

  async function carregarUploads() {
    const r = await fetch('/api/admin/uploads')
    if (r.ok) setUploads(await r.json())
  }

  async function salvarUsuario(e) {
    e.preventDefault()
    setMsg('')
    const method = editId ? 'PUT' : 'POST'
    const body = editId ? { ...form, id: editId } : form
    const r = await fetch('/api/admin/usuarios', { method, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) { setMsg('Erro: ' + d.error); return }
    setMsg(editId ? 'Usuário atualizado!' : 'Usuário criado!')
    setForm({ nome:'', email:'', senha:'', role:'cliente', paginas:['vendedor','produto','cliente','comparacao'] })
    setEditId(null)
    carregarUsuarios()
  }

  async function excluirUsuario(id) {
    if (!confirm('Excluir este usuário?')) return
    await fetch('/api/admin/usuarios', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    carregarUsuarios()
  }

  function editarUsuario(u) {
    setEditId(u.id)
    setForm({ nome: u.nome, email: u.email, senha:'', role: u.role, paginas: u.paginas })
    setAba('usuarios')
    window.scrollTo(0,0)
  }

  async function uploadPlanilha(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('Lendo arquivo...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      setUploadMsg('Enviando para o servidor...')
      const r = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, fileName: file.name })
      })
      const d = await r.json()
      setUploading(false)
      if (r.ok) setUploadMsg(`✅ ${d.total} registros importados com sucesso!`)
      else setUploadMsg('❌ Erro: ' + d.error)
      carregarUploads()
      fileRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  async function sair() {
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/')
  }

  const togglePagina = (p) => {
    setForm(f => ({ ...f, paginas: f.paginas.includes(p) ? f.paginas.filter(x=>x!==p) : [...f.paginas, p] }))
  }

  const st = {
    page: { minHeight:'100vh', background:'#f4f6fb', fontFamily:"'Segoe UI',system-ui,sans-serif", fontSize:13 },
    header: { background:'#0b2a8a', padding:'0 28px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' },
    card: { background:'white', borderRadius:12, boxShadow:'0 2px 8px rgba(19,65,196,0.08)', border:'1px solid #e2e6f0', padding:'20px 24px', marginBottom:16 },
    label: { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#6b7a99', display:'block', marginBottom:5 },
    input: { width:'100%', border:'1.5px solid #e2e6f0', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#0f1729', outline:'none', marginBottom:12, boxSizing:'border-box' },
    btn: { padding:'8px 18px', borderRadius:8, border:'none', background:'#1341c4', color:'white', fontSize:12, fontWeight:600, cursor:'pointer' },
    btnVerm: { padding:'6px 12px', borderRadius:6, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:600, cursor:'pointer' },
    btnVerde: { padding:'8px 18px', borderRadius:8, border:'none', background:'#16a34a', color:'white', fontSize:12, fontWeight:600, cursor:'pointer' },
    tab: (a) => ({ padding:'8px 20px', borderRadius:8, border:'none', background: aba===a?'#1341c4':'rgba(255,255,255,0.1)', color: aba===a?'white':'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, cursor:'pointer' }),
    badge: (r) => ({ padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, background: r==='admin'?'#fef3c7':'#e8eeff', color: r==='admin'?'#92400e':'#1341c4' }),
    th: { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:'#6b7a99', padding:'0 8px 10px', borderBottom:'2px solid #e2e6f0', textAlign:'left' },
    td: { padding:'9px 8px', borderBottom:'1px solid #f3f4f6', fontSize:12, color:'#0f1729', verticalAlign:'middle' },
  }

  return (
    <>
      <Head><title>Clamalu · Admin</title></Head>
      <div style={st.page}>
        <div style={st.header}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#0b2a8a'}}>CL</div>
            <div><div style={{color:'white',fontSize:16,fontWeight:700}}>Clamalu</div><div style={{color:'rgba(255,255,255,0.5)',fontSize:11}}>Painel Administrativo</div></div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button style={st.tab('usuarios')} onClick={()=>setAba('usuarios')}>👥 Usuários</button>
            <button style={st.tab('planilha')} onClick={()=>setAba('planilha')}>📊 Planilha</button>
            <button style={st.tab('uploads')} onClick={()=>setAba('uploads')}>📋 Histórico</button>
            <div style={{width:1,height:20,background:'rgba(255,255,255,0.2)',margin:'0 8px'}}></div>
            <button onClick={()=>router.push('/dashboard/vendedor')} style={{...st.btn,background:'rgba(255,255,255,0.15)',fontSize:11}}>Ver Dashboard</button>
            <button onClick={sair} style={{...st.btn,background:'rgba(220,38,38,0.8)',fontSize:11}}>Sair</button>
          </div>
        </div>

        <div style={{padding:'24px 28px'}}>

          {/* ABA USUÁRIOS */}
          {aba === 'usuarios' && (
            <>
              <div style={st.card}>
                <h3 style={{fontSize:13,fontWeight:700,color:'#0f1729',marginBottom:16}}>{editId ? '✏️ Editar usuário' : '➕ Novo usuário'}</h3>
                <form onSubmit={salvarUsuario}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={st.label}>Nome completo</label>
                      <input style={st.input} value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do usuário" required />
                    </div>
                    <div>
                      <label style={st.label}>E-mail</label>
                      <input style={st.input} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com" required />
                    </div>
                    <div>
                      <label style={st.label}>Senha {editId && '(deixe vazio para manter)'}</label>
                      <input style={st.input} type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))} placeholder="••••••••" {...(!editId && {required:true})} />
                    </div>
                    <div>
                      <label style={st.label}>Perfil</label>
                      <select style={st.input} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                        <option value="cliente">Cliente (só visualiza)</option>
                        <option value="admin">Admin (acesso total)</option>
                      </select>
                    </div>
                  </div>
                  <label style={st.label}>Páginas que este usuário pode acessar</label>
                  <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                    {PAGINAS.map(p => (
                      <label key={p} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,cursor:'pointer',padding:'6px 14px',borderRadius:8,border:`1.5px solid ${form.paginas.includes(p)?'#1341c4':'#e2e6f0'}`,background:form.paginas.includes(p)?'#e8eeff':'white',color:form.paginas.includes(p)?'#1341c4':'#6b7a99'}}>
                        <input type="checkbox" checked={form.paginas.includes(p)} onChange={()=>togglePagina(p)} style={{display:'none'}} />
                        {p.charAt(0).toUpperCase()+p.slice(1)}
                      </label>
                    ))}
                  </div>
                  {msg && <p style={{color: msg.includes('Erro')?'#dc2626':'#16a34a',fontSize:12,marginBottom:10}}>{msg}</p>}
                  <div style={{display:'flex',gap:8}}>
                    <button type="submit" style={st.btn}>{editId ? 'Salvar alterações' : 'Criar usuário'}</button>
                    {editId && <button type="button" onClick={()=>{setEditId(null);setForm({nome:'',email:'',senha:'',role:'cliente',paginas:PAGINAS})}} style={{...st.btn,background:'#6b7a99'}}>Cancelar</button>}
                  </div>
                </form>
              </div>

              <div style={st.card}>
                <h3 style={{fontSize:13,fontWeight:700,color:'#0f1729',marginBottom:16}}>👥 Usuários cadastrados</h3>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    {['Nome','E-mail','Perfil','Páginas','Status','Ações'].map(h=><th key={h} style={st.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id} style={{}} onMouseEnter={e=>e.currentTarget.style.background='#f7f9ff'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td style={st.td}><strong>{u.nome}</strong></td>
                        <td style={st.td}>{u.email}</td>
                        <td style={st.td}><span style={st.badge(u.role)}>{u.role === 'admin' ? '🔑 Admin' : '👤 Cliente'}</span></td>
                        <td style={st.td}>{(u.paginas||[]).join(', ')}</td>
                        <td style={st.td}><span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,background:u.ativo?'#dcfce7':'#fef2f2',color:u.ativo?'#15803d':'#dc2626'}}>{u.ativo?'Ativo':'Inativo'}</span></td>
                        <td style={st.td}>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>editarUsuario(u)} style={{...st.btn,padding:'5px 10px',fontSize:11}}>Editar</button>
                            <button onClick={()=>excluirUsuario(u.id)} style={st.btnVerm}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ABA PLANILHA */}
          {aba === 'planilha' && (
            <div style={st.card}>
              <h3 style={{fontSize:13,fontWeight:700,color:'#0f1729',marginBottom:8}}>📊 Upload de planilha de vendas</h3>
              <p style={{fontSize:12,color:'#6b7a99',marginBottom:20}}>Envie a planilha Excel (.xlsx) com os dados de vendas. Os dados anteriores serão substituídos pelos novos.</p>

              <div style={{border:'2px dashed #e2e6f0',borderRadius:12,padding:40,textAlign:'center',background:'#f9fafb',marginBottom:16}}>
                <div style={{fontSize:40,marginBottom:12}}>📂</div>
                <p style={{fontSize:13,fontWeight:600,color:'#0f1729',marginBottom:4}}>Selecione a planilha Excel</p>
                <p style={{fontSize:11,color:'#6b7a99',marginBottom:16}}>Formato aceito: .xlsx — Colunas: N.F, DATA, CLIENTE, CIDADE, UF, PRODUTO, EMPRESA, QTDE, VALOR UNIT., VALOR TOTAL, VENDEDOR</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={uploadPlanilha} style={{display:'none'}} id="fileInput" />
                <label htmlFor="fileInput" style={{...st.btnVerde,cursor:'pointer',display:'inline-block',padding:'10px 24px'}}>
                  {uploading ? '⏳ Processando...' : '📤 Selecionar arquivo'}
                </label>
              </div>

              {uploadMsg && (
                <div style={{padding:'12px 16px',borderRadius:8,background: uploadMsg.includes('✅')?'#dcfce7':'#fef2f2',color: uploadMsg.includes('✅')?'#15803d':'#dc2626',fontSize:13,fontWeight:600}}>
                  {uploadMsg}
                </div>
              )}
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {aba === 'uploads' && (
            <div style={st.card}>
              <h3 style={{fontSize:13,fontWeight:700,color:'#0f1729',marginBottom:16}}>📋 Histórico de uploads</h3>
              {uploads.length === 0 ? (
                <p style={{color:'#6b7a99',fontSize:12}}>Nenhum upload realizado ainda.</p>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    {['Arquivo','Total de linhas','Enviado por','Data'].map(h=><th key={h} style={st.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {uploads.map(u => (
                      <tr key={u.id}>
                        <td style={st.td}>{u.nome_arquivo}</td>
                        <td style={st.td}>{u.total_linhas?.toLocaleString('pt-BR')}</td>
                        <td style={st.td}>{u.enviado_por}</td>
                        <td style={st.td}>{new Date(u.criado_em).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ req }) {
  const { parse } = await import('cookie')
  const { verifyToken } = await import('../../lib/auth')
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (!user || user.role !== 'admin') return { redirect: { destination: '/', permanent: false } }
  return { props: { user } }
}
