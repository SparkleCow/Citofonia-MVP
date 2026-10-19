import { useEffect, useState } from 'react'
import { callsApi } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { useCall } from '../../context/call-context'
import EmptyState from '../../components/EmptyState'
import { BellIcon, PhoneIcon, ShieldIcon, UsersIcon } from '../../components/icons'

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  SECURITY: 'Vigilancia',
  USER: 'Residente',
}

export default function VigilanciaPage() {
  const { user } = useAuth()
  const { startCall, busy, call } = useCall()
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        setResidents(await callsApi.residents())
      } catch (err) {
        setError(err.message || 'No se pudo cargar el directorio de residentes')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
            <PhoneIcon />
          </span>
          <h3>Llamar a un residente</h3>
          <p>Llama al citofono del residente para avisarle desde el directorio de abajo.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <ShieldIcon />
          </span>
          <h3>Control de accesos</h3>
          <p>Registro de entradas y salidas, visitantes autorizados y avisos de seguridad.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <BellIcon />
          </span>
          <h3>Incidencias</h3>
          <p>Partes de aviso, incidencias de mantenimiento y seguimiento de cada caso.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Directorio de residentes</h2>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && (
          <div className="loading-block">
            <span className="spinner" aria-hidden="true" />
            Cargando residentes...
          </div>
        )}

        {!loading && residents.length === 0 && !error && (
          <EmptyState
            icon={<UsersIcon />}
            title="Sin residentes con vivienda"
            description="Cuando administracion vincule residentes a una vivienda apareceran aqui para poder llamarles."
          />
        )}

        {!loading && residents.length > 0 && (
          <ul className="call-directory">
            {residents.map((resident) => (
              <li key={resident.id} className="call-directory-item">
                <div className="call-directory-info">
                  <strong>
                    {resident.firstName} {resident.lastName}
                  </strong>
                  <span className="muted">{resident.email}</span>
                </div>
                <span className="badge">{resident.apartmentIdentifier}</span>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  disabled={busy}
                  onClick={() => startCall(resident)}
                >
                  <PhoneIcon />
                  Llamar
                </button>
              </li>
            ))}
          </ul>
        )}

        {call && (
          <p className="muted" style={{ marginTop: '12px' }}>
            Llamada en curso con {call.peerName}.
          </p>
        )}
      </div>
    </div>
  )
}
