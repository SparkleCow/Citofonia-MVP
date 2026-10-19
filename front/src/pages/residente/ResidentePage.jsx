import { useEffect, useState } from 'react'
import { notificationsApi } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { useCall } from '../../context/call-context'
import { BellIcon, HomeIcon, PhoneIcon } from '../../components/icons'

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  SECURITY: 'Vigilancia',
  USER: 'Residente',
}

const NOTIFICATION_LABELS = {
  GENERAL: 'Mensajes generales del portal',
  VISIT: 'Aviso de llegada de visitas',
  DELIVERY: 'Aviso de entrega de domicilios',
}

export default function ResidentePage() {
  const { user } = useAuth()
  const { startPortalCall, busy, call } = useCall()
  const [prefs, setPrefs] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        setPrefs(await notificationsApi.preferences())
      } catch {
        setPrefs(null)
      }
    })()
  }, [])

  const name = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
  const initial = (user.firstName || user.email || '?').charAt(0).toUpperCase()
  const housingLabel = !user.apartmentIdentifier
    ? null
    : user.owner
      ? user.occupiesApartment
        ? 'Propietario residente'
        : 'Propietario (no reside aqui)'
      : 'Inquilino'

  return (
    <div className="page">
      <div className="hero">
        <span className="hero-avatar" aria-hidden="true">
          {initial}
        </span>
        <div>
          <h1>Hola, {name}</h1>
          <p>
            {ROLE_LABELS[user.roles?.[0]] || 'Residente'}
            {user.apartmentIdentifier ? ` · Vivienda ${user.apartmentIdentifier}` : ''}
            {housingLabel ? ` · ${housingLabel}` : ''}
          </p>
        </div>
      </div>

      {user.enabled === false && (
        <div className="alert alert-warning">
          Tu cuenta aun no esta habilitada por administracion: hasta entonces no podras usar todos
          los servicios.
        </div>
      )}

      <div className="grid-cards">
        <div className="feature-card">
          <span className="feature-icon">
            <PhoneIcon />
          </span>
          <h3>Llamar a porteria</h3>
          <p>Habla con el vigilante de turno desde tu movil, sin tener que bajar.</p>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={startPortalCall}>
            <PhoneIcon />
            Llamar a porteria
          </button>
          {call && <p className="muted">Llamada en curso con {call.peerName}.</p>}
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <BellIcon />
          </span>
          <h3>Avisos del edificio</h3>
          <p>Comunicados de la administracion, cortes de agua y reuniones de vecinos.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">
            <HomeIcon />
          </span>
          <h3>Tu vivienda</h3>
          <p>
            {user.apartmentIdentifier
              ? `Vivienda ${user.apartmentIdentifier}${housingLabel ? ` · ${housingLabel}` : ''}.`
              : 'Aun no tienes vivienda vinculada; la administracion podra asignartela.'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Notificaciones que recibiras</h2>
        {prefs === null ? (
          <p className="muted">Comprobando tus notificaciones...</p>
        ) : (
          <>
            <ul className="notification-list">
              <li>
                <span className={`status ${prefs.general ? 'status-on' : 'status-off'}`}>
                  {NOTIFICATION_LABELS.GENERAL}
                </span>
                <span className="muted">
                  {prefs.general ? 'Activas para toda cuenta' : 'Desactivadas'}
                </span>
              </li>
              <li>
                <span className={`status ${prefs.visits ? 'status-on' : 'status-off'}`}>
                  {NOTIFICATION_LABELS.VISIT}
                </span>
                <span className="muted">
                  {prefs.visits
                    ? `En ${prefs.apartmentIdentifier || 'tu vivienda'}`
                    : 'Solo si resides en la vivienda'}
                </span>
              </li>
              <li>
                <span className={`status ${prefs.deliveries ? 'status-on' : 'status-off'}`}>
                  {NOTIFICATION_LABELS.DELIVERY}
                </span>
                <span className="muted">
                  {prefs.deliveries
                    ? `En ${prefs.apartmentIdentifier || 'tu vivienda'}`
                    : 'Solo si resides en la vivienda'}
                </span>
              </li>
            </ul>
            {!prefs.visits && (
              <div className="alert alert-info">
                Como propietario que no reside en la vivienda, recibiras los mensajes generales del
                portal, pero no los avisos de visitas ni de domicilios.
              </div>
            )}
          </>
        )}
      </div>

      <p className="muted" style={{ marginTop: '18px' }}>
        Estamos terminando estos servicios: en cuanto se activen apareceran aqui.
      </p>
    </div>
  )
}
