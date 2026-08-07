import { supabaseAdmin } from '../../../lib/supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, senha } = req.body
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatórios' })

  const db = supabaseAdmin()
  const { data: user, error } = await db
    .from('usuarios')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('ativo', true)
    .single()

  if (error || !user) return res.status(401).json({ error: 'Usuário não encontrado' })

  const senhaOk = await bcrypt.compare(senha, user.senha_hash)
  if (!senhaOk) return res.status(401).json({ error: 'Senha incorreta' })

  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, role: user.role, paginas: user.paginas, vendedores_ocultos: user.vendedores_ocultos || [] },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )

  res.setHeader('Set-Cookie', serialize('clamalu_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/'
  }))

  return res.status(200).json({ ok: true, role: user.role, paginas: user.paginas, nome: user.nome })
}
