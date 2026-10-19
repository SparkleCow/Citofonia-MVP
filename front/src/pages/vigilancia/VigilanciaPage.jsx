import { useAuth } from '../../context/auth-context'
import { BellIcon, ShieldIcon, UsersIcon } from '../../components/icons'

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  SECURITY: 'Vigilancia',
  USER: 'Residente',
}

export default function VigilanciaPage() {
  const { user } = useAuth()
  const name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
  const initial = (user.firstName || user.email || '?').charAt(0).toUpperCase()

  return (
    <div className="page">
      <div className="hero">
        <span className="hero-avatar" aria-hidden="true">
          {initial}
        </span>
        <div>
          <h1>Hola, {name}</h1>
          <p>{ROLE_LABELS[user.roles?.[0]] || 'Vigilancia'} · Turno del edificio</p>
        </div>
      </div>

      <div className="grid-cards">
        <div className="feature-card">
          <span className="feature-icon">
            <ShieldIcon />
          </span>
          <h3>Control de accesos</h3>
          <p>Registro de entradas y salidas, visitantes autorizados y avisos de seguridad.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <UsersIcon />
          </span>
          <h3>Directorio de residentes</h3>
          <p>Consulta rapida de vecinos y viviendas para resolver incidencias en el portal.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <BellIcon />
          </span>
          <h3>Incidencias</h3>
          <p>Partes de aviso, incidencias de mantenimiento y seguimiento de cada caso.</p>
        </div>
      </div>

      <p className="muted" style={{ marginTop: '18px' }}>
        Estamos terminando estas herramientas: en cuanto se activen apareceran aqui.
      </p>
    </div>
  )
}
