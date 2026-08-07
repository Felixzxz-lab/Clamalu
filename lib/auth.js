import jwt from 'jsonwebtoken'
import { parse } from 'cookie'

export function getTokenFromReq(req) {
  const cookies = parse(req.headers.cookie || '')
  return cookies.clamalu_token || null
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const token = getTokenFromReq(req)
    const user = verifyToken(token)
    if (!user) return res.status(401).json({ error: 'Não autorizado' })
    req.user = user
    return handler(req, res)
  }
}

// Vendedores que este usuário NÃO enxerga. Vazio/ausente = vê todos,
// inclusive vendedores que entrarem depois — por isso é lista de ocultos
// e não de permitidos.
export function vendedoresOcultos(user) {
  return user?.vendedores_ocultos || []
}

// Aplica na query a restrição do usuário + o que ele pediu no filtro.
// Ordem: o oculto sempre vence o solicitado.
export function aplicarFiltroVendedor(q, user, solicitados) {
  const ocultos = vendedoresOcultos(user)
  const pedidos = (solicitados || []).filter(v => !ocultos.includes(v))

  // Pediu explicitamente e sobrou algo: filtra por isso.
  if (pedidos.length) return q.in('vendedor', pedidos)

  // Pediu só vendedor oculto: não devolve nada (em vez de devolver tudo).
  if (solicitados?.length) return q.in('vendedor', ['__NENHUM__'])

  // Pediu "todos": tudo menos os ocultos.
  if (ocultos.length) {
    return q.not('vendedor', 'in', `(${ocultos.map(v => `"${v}"`).join(',')})`)
  }
  return q
}

export function requireAdmin(handler) {
  return async (req, res) => {
    const token = getTokenFromReq(req)
    const user = verifyToken(token)
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })
    req.user = user
    return handler(req, res)
  }
}
