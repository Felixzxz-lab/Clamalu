import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const PAGINAS = ['vendedor','produto','cliente','comparacao','financeiro']
const PAGINAS_PADRAO = ['vendedor','produto','cliente','comparacao'] // novos usuários (financeiro é concedido à parte)
const RESPONSAVEIS = ['THIAGO','WENDEL','CLEBER','CLAMALU'] // responsáveis/vendedores selecionáveis (vazio = todos)

export default function Admin({ user }) {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState([])
  const [uploads, setUploads] = useState([])
  const [aba, setAba] = useState('usuarios')
  const [form, setForm] = useState({ nome:'', email:'', senha:'', role:'cliente', paginas:['vendedor','produto','cliente','comparacao'], vendedores:[] })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef()
  // prévia de importação
  const [arquivo, setArquivo] = useState(null)   // { base64, nome }
  const [previa, setPrevia] = useState(null)      // { abas: [...] }
  const [abasSel, setAbasSel] = useState([])      // nomes de abas marcadas
  const [limparAntes, setLimparAntes] = useState(false)
  // importação de DESPESAS (financeiro) — estado próprio
  const fileRefD = useRef()
  const [arqD, setArqD] = useState(null)       // { base64, nome }
  const [previaD, setPreviaD] = useState(null) // { abas: [...] }
  const [abasSelD, setAbasSelD] = useState([])
  const [uploadingD, setUploadingD] = useState(false)
  const [uploadMsgD, setUploadMsgD] = useState('')

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
    setForm({ nome:'', email:'', senha:'', role:'cliente', paginas:['vendedor','produto','cliente','comparacao'], vendedores:[] })
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
    setForm({ nome: u.nome, email: u.email, senha:'', role: u.role, paginas: u.paginas, vendedores: u.vendedores || [] })
    setAba('usuarios')
    window.scrollTo(0,0)
  }

  function resetImport() {
    setArquivo(null); setPrevia(null); setAbasSel([]); setLimparAntes(false)
    setUploadMsg(''); if (fileRef.current) fileRef.current.value = ''
  }

  // Passo 1: lê o arquivo e pede a prévia (NÃO grava nada)
  async function escolherArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true); setPrevia(null); setUploadMsg('Lendo e analisando o arquivo...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      try {
        const r = await fetch('/api/admin/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData: base64 })
        })
        const d = await r.json()
        if (!r.ok) { setUploadMsg('❌ Erro: ' + d.error); setUploading(false); return }
        setArquivo({ base64, nome: file.name })
        setPrevia(d)
        // por padrão marca a primeira aba que tem dados
        const comDados = d.abas.filter(a => a.totalLinhas > 0)
        setAbasSel(comDados.length ? [comDados[0].nome] : [])
        setUploadMsg('')
      } catch (err) {
        setUploadMsg('❌ Erro ao ler o arquivo: ' + err.message)
      }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const toggleAba = (nome) => setAbasSel(s => s.includes(nome) ? s.filter(x => x !== nome) : [...s, nome])

  // Passo 2: confirma e importa as abas selecionadas
  async function confirmarImport() {
    if (!arquivo || !abasSel.length) return
    const totalSel = previa.abas.filter(a => abasSel.includes(a.nome)).reduce((s, a) => s + a.totalLinhas, 0)
    const aviso = limparAntes
      ? `Isto vai APAGAR todos os dados atuais e importar ${totalSel.toLocaleString('pt-BR')} linhas. Continuar?`
      : `Isto vai ADICIONAR ${totalSel.toLocaleString('pt-BR')} linhas aos dados já existentes. Continuar?`
    if (!confirm(aviso)) return
    setUploading(true); setUploadMsg('Importando...')
    try {
      const r = await fetch('/api/admin/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: arquivo.base64, fileName: arquivo.nome, sheets: abasSel, limparAntes })
      })
      const d = await r.json()
      if (r.ok) {
        setUploadMsg(`✅ ${d.total.toLocaleString('pt-BR')} registros importados${d.limpou ? ' (dados anteriores apagados)' : ' e somados aos existentes'}!`)
        setArquivo(null); setPrevia(null); setAbasSel([]); setLimparAntes(false)
        if (fileRef.current) fileRef.current.value = ''
        carregarUploads()
      } else {
        setUploadMsg('❌ Erro: ' + d.error)
      }
    } catch (err) {
      setUploadMsg('❌ Erro: ' + err.message)
    }
    setUploading(false)
  }

  // ---- Importação de DESPESAS (financeiro) ----
  function resetImportD() {
    setArqD(null); setPreviaD(null); setAbasSelD([]); setUploadMsgD('')
    if (fileRefD.current) fileRefD.current.value = ''
  }

  async function escolherArquivoD(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingD(true); setPreviaD(null); setUploadMsgD('Lendo e analisando o arquivo...')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      try {
        const r = await fetch('/api/admin/preview-despesas', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData: base64 })
        })
        const d = await r.json()
        if (!r.ok) { setUploadMsgD('❌ Erro: ' + d.error); setUploadingD(false); return }
        setArqD({ base64, nome: file.name })
        setPreviaD(d)
        const comDados = d.abas.filter(a => a.ok && a.totalRegistros > 0)
        setAbasSelD(comDados.length ? [comDados[0].nome] : [])
        setUploadMsgD('')
      } catch (err) {
        setUploadMsgD('❌ Erro ao ler o arquivo: ' + err.message)
      }
      setUploadingD(false)
    }
    reader.readAsDataURL(file)
  }

  const toggleAbaD = (nome) => setAbasSelD(s => s.includes(nome) ? s.filter(x => x !== nome) : [...s, nome])

  async function confirmarImportD() {
    if (!arqD || !abasSelD.length) return
    const abasImp = previaD.abas.filter(a => abasSelD.includes(a.nome))
    const anos = [...new Set(abasImp.map(a => a.ano))].join(', ')
    if (!confirm(`Isto vai SUBSTITUIR as despesas do(s) ano(s) ${anos} pelos dados deste arquivo. Continuar?`)) return
    setUploadingD(true); setUploadMsgD('Importando...')
    try {
      const r = await fetch('/api/admin/upload-despesas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: arqD.base64, fileName: arqD.nome, sheets: abasSelD })
      })
      const d = await r.json()
      if (r.ok) {
        setUploadMsgD(`✅ ${d.total.toLocaleString('pt-BR')} lançamentos importados (${d.valorTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}) — ano(s) ${d.anos.join(', ')}.`)
        resetImportD(); carregarUploads()
      } else {
        setUploadMsgD('❌ Erro: ' + d.error)
      }
    } catch (err) {
      setUploadMsgD('❌ Erro: ' + err.message)
    }
    setUploadingD(false)
  }

  async function sair() {
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/')
  }

  const togglePagina = (p) => {
    setForm(f => ({ ...f, paginas: f.paginas.includes(p) ? f.paginas.filter(x=>x!==p) : [...f.paginas, p] }))
  }
  const toggleVendedor = (v) => {
    setForm(f => ({ ...f, vendedores: (f.vendedores||[]).includes(v) ? f.vendedores.filter(x=>x!==v) : [...(f.vendedores||[]), v] }))
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
            <button style={st.tab('planilha')} onClick={()=>setAba('planilha')}>📊 Vendas</button>
            <button style={st.tab('despesas')} onClick={()=>setAba('despesas')}>💰 Despesas</button>
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
                  <label style={st.label}>Responsáveis que este usuário pode ver nos filtros <span style={{textTransform:'none',fontWeight:500,color:'#9aa6bf'}}>(nenhum marcado = vê todos)</span></label>
                  <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
                    {RESPONSAVEIS.map(v => {
                      const on = (form.vendedores||[]).includes(v)
                      return (
                      <label key={v} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,cursor:'pointer',padding:'6px 14px',borderRadius:8,border:`1.5px solid ${on?'#16a34a':'#e2e6f0'}`,background:on?'#dcfce7':'white',color:on?'#15803d':'#6b7a99'}}>
                        <input type="checkbox" checked={on} onChange={()=>toggleVendedor(v)} style={{display:'none'}} />
                        {v}
                      </label>
                      )
                    })}
                  </div>
                  {msg && <p style={{color: msg.includes('Erro')?'#dc2626':'#16a34a',fontSize:12,marginBottom:10}}>{msg}</p>}
                  <div style={{display:'flex',gap:8}}>
                    <button type="submit" style={st.btn}>{editId ? 'Salvar alterações' : 'Criar usuário'}</button>
                    {editId && <button type="button" onClick={()=>{setEditId(null);setForm({nome:'',email:'',senha:'',role:'cliente',paginas:PAGINAS_PADRAO,vendedores:[]})}} style={{...st.btn,background:'#6b7a99'}}>Cancelar</button>}
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
                        <td style={st.td}>{(u.paginas||[]).join(', ')}{u.vendedores?.length ? <span style={{display:'block',fontSize:10,color:'#15803d',fontWeight:600}}>👤 só: {u.vendedores.join(', ')}</span> : <span style={{display:'block',fontSize:10,color:'#9aa6bf'}}>👤 todos os responsáveis</span>}</td>
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
              <h3 style={{fontSize:13,fontWeight:700,color:'#0f1729',marginBottom:8}}>📊 Importar planilha de vendas</h3>
              <p style={{fontSize:12,color:'#6b7a99',marginBottom:20}}>Selecione o arquivo Excel (.xlsx). Você verá uma prévia dos dados e escolhe as abas antes de confirmar. Por padrão os dados são <strong>somados</strong> aos já existentes.</p>

              {!previa && (
                <div style={{border:'2px dashed #e2e6f0',borderRadius:12,padding:40,textAlign:'center',background:'#f9fafb',marginBottom:16}}>
                  <div style={{fontSize:40,marginBottom:12}}>📂</div>
                  <p style={{fontSize:13,fontWeight:600,color:'#0f1729',marginBottom:4}}>Selecione a planilha Excel</p>
                  <p style={{fontSize:11,color:'#6b7a99',marginBottom:16}}>Formato aceito: .xlsx — Colunas: N.F, DATA, CLIENTE, CIDADE, UF, PRODUTO, EMPRESA, QTDE, VALOR UNIT., VALOR TOTAL, VENDEDOR</p>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={escolherArquivo} style={{display:'none'}} id="fileInput" />
                  <label htmlFor="fileInput" style={{...st.btnVerde,cursor:'pointer',display:'inline-block',padding:'10px 24px'}}>
                    {uploading ? '⏳ Analisando...' : '📤 Selecionar arquivo'}
                  </label>
                </div>
              )}

              {/* PRÉVIA */}
              {previa && (
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontSize:12,color:'#0f1729'}}>📄 <strong>{arquivo?.nome}</strong> — marque as abas que deseja importar:</div>
                    <button onClick={resetImport} style={{...st.btn,background:'#6b7a99',fontSize:11}}>Trocar arquivo</button>
                  </div>

                  {previa.abas.map(a => {
                    const sel = abasSel.includes(a.nome)
                    const vazia = a.totalLinhas === 0
                    return (
                      <div key={a.nome} style={{border:`1.5px solid ${sel?'#1341c4':'#e2e6f0'}`,borderRadius:10,padding:16,marginBottom:12,background:sel?'#f7f9ff':'white',opacity:vazia?0.55:1}}>
                        <label style={{display:'flex',alignItems:'center',gap:10,cursor:vazia?'not-allowed':'pointer',marginBottom:sel?12:0}}>
                          <input type="checkbox" checked={sel} disabled={vazia} onChange={()=>toggleAba(a.nome)} />
                          <span style={{fontSize:13,fontWeight:700,color:'#0f1729'}}>{a.nome}</span>
                          <span style={{fontSize:11,color:'#6b7a99'}}>
                            {a.totalLinhas.toLocaleString('pt-BR')} linhas · {a.clientesDistintos} clientes · {a.valorTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            {a.periodo && ` · ${a.periodo.de} a ${a.periodo.ate}`}
                            {a.semData > 0 && <span style={{color:'#b45309'}}> · ⚠️ {a.semData} sem data</span>}
                          </span>
                        </label>

                        {sel && a.amostra?.length > 0 && (
                          <div style={{overflowX:'auto',marginTop:6}}>
                            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                              <thead><tr>
                                {['Data','Cliente','Cidade','UF','Produto','Qtde','Valor Total','Vendedor'].map(h=><th key={h} style={st.th}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {a.amostra.map((r,i)=>(
                                  <tr key={i}>
                                    <td style={st.td}>{r.data||'—'}</td>
                                    <td style={st.td}>{r.cliente||'—'}</td>
                                    <td style={st.td}>{r.cidade||'—'}</td>
                                    <td style={st.td}>{r.uf||'—'}</td>
                                    <td style={st.td}>{r.produto||'—'}</td>
                                    <td style={st.td}>{r.qtde}</td>
                                    <td style={st.td}>{(r.valor_total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                                    <td style={st.td}>{r.vendedor||'—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p style={{fontSize:10,color:'#6b7a99',marginTop:6}}>Mostrando as 8 primeiras linhas (de {a.totalLinhas.toLocaleString('pt-BR')}).</p>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#0f1729',margin:'14px 0',padding:'10px 14px',borderRadius:8,background:'#fff7ed',border:'1px solid #fed7aa'}}>
                    <input type="checkbox" checked={limparAntes} onChange={e=>setLimparAntes(e.target.checked)} />
                    <span>🗑️ Apagar <strong>todos os dados atuais</strong> antes de importar (carga limpa). Deixe desmarcado para <strong>somar</strong> aos dados existentes.</span>
                  </label>

                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={confirmarImport} disabled={uploading || !abasSel.length} style={{...st.btnVerde,padding:'10px 24px',opacity:(uploading||!abasSel.length)?0.5:1,cursor:(uploading||!abasSel.length)?'not-allowed':'pointer'}}>
                      {uploading ? '⏳ Importando...' : `✅ Confirmar importação (${abasSel.length} aba${abasSel.length!==1?'s':''})`}
                    </button>
                    <button onClick={resetImport} style={{...st.btn,background:'#6b7a99'}}>Cancelar</button>
                  </div>
                </div>
              )}

              {uploadMsg && (
                <div style={{marginTop:16,padding:'12px 16px',borderRadius:8,background: uploadMsg.includes('✅')?'#dcfce7':'#fef2f2',color: uploadMsg.includes('✅')?'#15803d':'#dc2626',fontSize:13,fontWeight:600}}>
                  {uploadMsg}
                </div>
              )}
            </div>
          )}

          {/* ABA DESPESAS (financeiro) */}
          {aba === 'despesas' && (
            <div style={st.card}>
              <h3 style={{fontSize:13,fontWeight:700,color:'#0f1729',marginBottom:8}}>💰 Importar planilha de despesas</h3>
              <p style={{fontSize:12,color:'#6b7a99',marginBottom:20}}>Formato matriz (fornecedor × mês), como a “RESUMO DESPESAS CLAMALU”. O ano é lido do nome da aba (ex.: “CLAMALU 2026”). A importação <strong>substitui</strong> as despesas do ano — pode re-subir a mesma planilha todo mês sem duplicar.</p>

              {!previaD && (
                <div style={{border:'2px dashed #e2e6f0',borderRadius:12,padding:40,textAlign:'center',background:'#f9fafb',marginBottom:16}}>
                  <div style={{fontSize:40,marginBottom:12}}>📂</div>
                  <p style={{fontSize:13,fontWeight:600,color:'#0f1729',marginBottom:4}}>Selecione a planilha de despesas</p>
                  <p style={{fontSize:11,color:'#6b7a99',marginBottom:16}}>Formatos aceitos: .ods, .xlsx, .xls</p>
                  <input ref={fileRefD} type="file" accept=".ods,.xlsx,.xls" onChange={escolherArquivoD} style={{display:'none'}} id="fileInputD" />
                  <label htmlFor="fileInputD" style={{...st.btnVerde,cursor:'pointer',display:'inline-block',padding:'10px 24px'}}>
                    {uploadingD ? '⏳ Analisando...' : '📤 Selecionar arquivo'}
                  </label>
                </div>
              )}

              {previaD && (
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontSize:12,color:'#0f1729'}}>📄 <strong>{arqD?.nome}</strong> — marque as abas que deseja importar:</div>
                    <button onClick={resetImportD} style={{...st.btn,background:'#6b7a99',fontSize:11}}>Trocar arquivo</button>
                  </div>

                  {previaD.abas.map(a => {
                    if (!a.ok) return (
                      <div key={a.nome} style={{border:'1.5px solid #fed7aa',borderRadius:10,padding:16,marginBottom:12,background:'#fff7ed'}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#0f1729'}}>{a.nome}</span>
                        <span style={{fontSize:11,color:'#b45309',marginLeft:8}}>⚠️ {a.erro}</span>
                      </div>
                    )
                    const sel = abasSelD.includes(a.nome)
                    const vazia = a.totalRegistros === 0
                    const MESN = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
                    return (
                      <div key={a.nome} style={{border:`1.5px solid ${sel?'#1341c4':'#e2e6f0'}`,borderRadius:10,padding:16,marginBottom:12,background:sel?'#f7f9ff':'white',opacity:vazia?0.55:1}}>
                        <label style={{display:'flex',alignItems:'center',gap:10,cursor:vazia?'not-allowed':'pointer',marginBottom:sel?12:0}}>
                          <input type="checkbox" checked={sel} disabled={vazia} onChange={()=>toggleAbaD(a.nome)} />
                          <span style={{fontSize:13,fontWeight:700,color:'#0f1729'}}>{a.nome}</span>
                          <span style={{fontSize:11,color:'#6b7a99'}}>
                            Ano <strong>{a.ano}</strong> · {a.totalRegistros.toLocaleString('pt-BR')} lançamentos · {a.fornecedores} fornecedores · {a.total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                            {a.meses?.length>0 && ` · meses: ${a.meses.map(m=>MESN[m-1]).join(', ')}`}
                          </span>
                        </label>

                        {sel && a.grupos?.length > 0 && (
                          <div style={{marginTop:6}}>
                            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.7px',color:'#6b7a99',marginBottom:8}}>Distribuição por grupo</div>
                            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                              {a.grupos.map(g=>(
                                <span key={g.grupo} style={{fontSize:11,padding:'4px 10px',borderRadius:8,background:'#eef2ff',color:'#1341c4',fontWeight:600}}>
                                  {g.grupo}: {g.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <div style={{display:'flex',gap:8,alignItems:'center',marginTop:14}}>
                    <button onClick={confirmarImportD} disabled={uploadingD || !abasSelD.length} style={{...st.btnVerde,padding:'10px 24px',opacity:(uploadingD||!abasSelD.length)?0.5:1,cursor:(uploadingD||!abasSelD.length)?'not-allowed':'pointer'}}>
                      {uploadingD ? '⏳ Importando...' : `✅ Confirmar importação (${abasSelD.length} aba${abasSelD.length!==1?'s':''})`}
                    </button>
                    <button onClick={resetImportD} style={{...st.btn,background:'#6b7a99'}}>Cancelar</button>
                  </div>
                </div>
              )}

              {uploadMsgD && (
                <div style={{marginTop:16,padding:'12px 16px',borderRadius:8,background: uploadMsgD.includes('✅')?'#dcfce7':'#fef2f2',color: uploadMsgD.includes('✅')?'#15803d':'#dc2626',fontSize:13,fontWeight:600}}>
                  {uploadMsgD}
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
