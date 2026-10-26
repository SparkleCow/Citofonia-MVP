import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { homePathForRoles } from '../utils/navigation'

/**
 * Protege una ruta: exige sesion y, opcionalmente, alguno de los roles.
 * Si cambia el usuario/rol, fuerza la entrada en la home del rol actual.
 */
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const home = homePathForRoles(user?.roles || [])

  const identity = user ? `${user.email || ''}|${[...(user.roles || [])].sort().join(',')}` : null
  const previousIdentity = useRef(identity)

  useEffect(() => {
    const changed = previousIdentity.current !== identity
    previousIdentity.current = identity
    if (changed && identity && location.pathname !== home) {
      navigate(home, { replace: true })
    }
  }, [identity, home, location.pathname, navigate])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && roles.length > 0) {
    const allowed = roles.some((role) => user.roles?.includes(role))
    if (!allowed) {
      return <Navigate to={home} replace />
    }
  }
  return children
}
