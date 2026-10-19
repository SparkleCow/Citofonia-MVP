import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { useMail } from '../context/mail-context'
import { homePathForRoles } from '../utils/navigation'
import { IntercomIcon } from './icons'

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  SECURITY: 'Vigilancia',
  USER: 'Residente',
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { stats } = useMail()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const roleLabel = ROLE_LABELS[user?.roles?.[0]] || user?.roles?.[0] || ''

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to={homePathForRoles(user?.roles || [])} className="brand">
          <span className="brand-mark">
            <IntercomIcon />
          </span>
          Citofonia
        </Link>
        <nav className="app-nav">
          <Link
            to="/buzon"
            className={`nav-link ${location.pathname === '/buzon' ? 'nav-link-active' : ''}`}
          >
            Buzon
            {stats.unread > 0 && (
              <span className="nav-badge" aria-label={`${stats.unread} mensajes sin leer`}>
                {stats.unread > 99 ? '99+' : stats.unread}
              </span>
            )}
          </Link>
          <span className="nav-user" title={user?.email}>
            {user?.email}
            {roleLabel && <span className="role-chip badge">{roleLabel}</span>}
          </span>
          <button type="button" className="btn btn-ghost btn-small" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
