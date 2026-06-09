import { supabaseAdmin } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/auth'

export default requireAdmin(async function handler(req, res) {
  const db = supabaseAdmin()
  const { data, error } = await db.from('uploads').select('*').order('criado_em', { ascending: false }).limit(20)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
})
