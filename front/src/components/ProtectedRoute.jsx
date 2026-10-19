import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { homePathForRoles } from '../utils/navigation'

/**
 * Protege una ruta: exige sesion y, opcionalmente, alguno de los roles.
 */
export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && roles.length > 0) {
    const allowed = roles.some((role) => user.roles?.includes(role))
    if (!allowed) {
      return <Navigate to={homePathForRoles(user.roles)} replace />
    }
  }
  return children
}
