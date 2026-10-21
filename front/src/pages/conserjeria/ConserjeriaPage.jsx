import { useEffect, useState } from 'react'
import { callsApi } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { useCall } from '../../context/call-context'
import EmptyState from '../../components/EmptyState'
import { AlertIcon, BellIcon, CalendarIcon, InboxIcon, PhoneIcon, ShieldIcon, UsersIcon } from '../../components/icons'
import VisitasSection from './VisitasSection'
import CorrespondenciaSection from './CorrespondenciaSection'

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  CONCIERGE: 'Conserje',
  USER: 'Residente',
}

export default function ConserjeriaPage() {
  const { user } = useAuth()
  const { startCall, startPanicAlert, busy, call } = useCall()
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [panicOpen, setPanicOpen] = useState(false)
  const [panicCode, setPanicCode] = useState('')
  const [panicError, setPanicError] = useState(null)

  useEffect(() => {
    if (activePanel !== 'directory' || loaded || loading) return
    ;(async () => {
      setLoading(true)
      try {
        setResidents(await callsApi.residents())
        setLoaded(true)
      } catch (err) {
        setError(err.message || 'No se pudo cargar el directorio de residentes')
      } finally {
        setLoading(false)
      }
    })()
  }, [activePanel, loaded, loading])

  const togglePanel = (panel) => setActivePanel((current) => (current === panel ? null : panel))

  const submitPanic = (event) => {
    event.preventDefault()
    const code = panicCode.trim()
    if (!code) {
      setPanicError('Introduce el codigo de la alerta general para activarla')
      return
    }
    setPanicError(null)
    setPanicCode('')
    setPanicOpen(false)
    startPanicAlert(code)
  }

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
          <p>{ROLE_LABELS[user.roles?.[0]] || 'Conserje'} · Turno del edificio</p>
        </div>
      </div>

      <div className="toolbar">
        <button
          type="button"
          className={activePanel === 'visits' ? 'btn btn-primary' : 'btn btn-ghost'}
          aria-expanded={activePanel === 'visits'}
          onClick={() => togglePanel('visits')}
        >
          <CalendarIcon />
          Visitas
        </button>
        <button
          type="button"
          className={activePanel === 'directory' ? 'btn btn-primary' : 'btn btn-ghost'}
          aria-expanded={activePanel === 'directory'}
          onClick={() => togglePanel('directory')}
        >
          <UsersIcon />
          Directorio
        </button>
        <button
          type="button"
          className={activePanel === 'correspondence' ? 'btn btn-primary' : 'btn btn-ghost'}
          aria-expanded={activePanel === 'correspondence'}
          onClick={() => togglePanel('correspondence')}
        >
          <InboxIcon />
          Correspondencia
        </button>
        <span className="muted">
          {activePanel === 'visits'
            ? 'Registro y avisos de visitas al portal'
            : activePanel === 'directory'
              ? 'Residentes con vivienda para llamar al citofono'
              : activePanel === 'correspondence'
                ? 'Paquetes y cartas recibidas en el porton'
                : 'Pulsa Visitas, Directorio o Correspondencia para empezar'}
        </span>
        <button
          type="button"
          className="btn btn-danger toolbar-panic"
          disabled={busy}
          onClick={() => {
            setPanicError(null)
            setPanicOpen((current) => !current)
          }}
        >
          <AlertIcon />
          Alerta general
        </button>
      </div>

      {panicOpen && (
        <form className="card panic-form" onSubmit={submitPanic}>
          <h2>Alerta general del edificio</h2>
          <p className="muted">
            Se avisara a todos los residentes con una alerta sonora y el primero que la atienda hablara contigo.
          </p>
          {panicError && <div className="alert alert-error">{panicError}</div>}
          <div className="field">
            <span>Codigo de autorizacion</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={panicCode}
              onChange={(event) => setPanicCode(event.target.value)}
              placeholder="123"
            />
          </div>
          <div className="row-actions">
            <button type="submit" className="btn btn-danger" disabled={busy}>
              <AlertIcon />
              Lanzar alerta
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setPanicOpen(false)
                setPanicCode('')
                setPanicError(null)
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {activePanel === 'visits' && <VisitasSection />}

      {activePanel === 'correspondence' && <CorrespondenciaSection />}

      {activePanel === 'directory' && (
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
      )}

      <div className="grid-cards">
        <div className="feature-card">
          <span className="feature-icon">
            <PhoneIcon />
          </span>
          <h3>Llamar a un residente</h3>
          <p>Abre el directorio de residentes para llamar al citofono de quien vive en el edificio.</p>
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
    </div>
  )
}
