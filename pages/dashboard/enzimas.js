import { parse } from 'cookie'
import { verifyToken } from '../../lib/auth'
import Mapeamento from '../../components/Mapeamento'

export default function Pagina({ user }) {
  return <Mapeamento user={user} categoria="enzima" />
}

export async function getServerSideProps({ req }) {
  const cookies = parse(req.headers.cookie || '')
  const user = verifyToken(cookies.clamalu_token)
  if (!user) return { redirect: { destination: '/', permanent: false } }
  if (!user.paginas?.includes('enzimas')) return { redirect: { destination: '/dashboard/' + (user.paginas?.[0] || ''), permanent: false } }
  return { props: { user } }
}
