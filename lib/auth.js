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

export function requireAdmin(handler) {
  return async (req, res) => {
    const token = getTokenFromReq(req)
    const user = verifyToken(token)
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })
    req.user = user
    return handler(req, res)
  }
}
