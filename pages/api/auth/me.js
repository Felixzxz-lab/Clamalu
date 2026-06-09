import { requireAuth } from '../../../lib/auth'

export default requireAuth(async function handler(req, res) {
  res.status(200).json({ user: req.user })
})
