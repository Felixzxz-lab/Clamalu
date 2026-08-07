import { supabaseAdmin } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/auth'
import bcrypt from 'bcryptjs'

export default requireAdmin(async function handler(req, res) {
  const db = supabaseAdmin()

  if (req.method === 'GET') {
    const { data, error } = await db.from('usuarios').select('id,nome,email,role,ativo,paginas,vendedores_ocultos,criado_em').order('criado_em', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { nome, email, senha, role, paginas, vendedores_ocultos } = req.body
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Campos obrigatórios' })
    const hash = await bcrypt.hash(senha, 10)
    const { data, error } = await db.from('usuarios').insert({
      nome, email: email.toLowerCase(), senha_hash: hash,
      role: role || 'cliente',
      paginas: paginas || ['vendedor', 'produto', 'cliente', 'comparacao'],
      vendedores_ocultos: vendedores_ocultos || []
    }).select().single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'PUT') {
    const { id, nome, email, senha, role, paginas, ativo, vendedores_ocultos } = req.body
    const update = { nome, email: email?.toLowerCase(), role, paginas, ativo }
    if (vendedores_ocultos !== undefined) update.vendedores_ocultos = vendedores_ocultos
    if (senha) update.senha_hash = await bcrypt.hash(senha, 10)
    const { data, error } = await db.from('usuarios').update(update).eq('id', id).select().single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await db.from('usuarios').delete().eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
})
