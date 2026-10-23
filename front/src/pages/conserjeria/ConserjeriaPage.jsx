import { useEffect, useMemo, useState } from 'react'
import { apartmentsApi, callsApi } from '../../api/client'
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
  const [apartments, setApartments] = useState([])
  const [residents, setResidents] = useState([])
  const [selectedApartmentId, setSelectedApartmentId] = useState(null)
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
      setError(null)
      try {
        const [apartmentList, residentList] = await Promise.all([
          apartmentsApi.options(),
          callsApi.residents(),
        ])
        setApartments(apartmentList)
        setResidents(residentList)
      } catch (err) {
        setError(err.message || 'No se pudo cargar el directorio de apartamentos')
      } finally {
        setLoading(false)
        setLoaded(true)
      }
    })()
  }, [activePanel, loaded, loading])

  const apartmentOptions = useMemo(
    () =>
      [...apartments].sort((a, b) =>
        a.identifier.localeCompare(b.identifier, 'es', { numeric: true, sensitivity: 'base' }),
      ),
    [apartments],
  )

  const residentsByApartment = useMemo(() => {
    const grouped = new Map()
    for (const resident of residents) {
      const list = grouped.get(resident.apartmentIdentifier) || []
      list.push(resident)
      grouped.set(resident.apartmentIdentifier, list)
    }
    for (const list of grouped.values()) {
      list.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es', {
          sensitivity: 'base',
        }),
      )
    }
    return grouped
  }, [residents])

  const selectedApartment =
    apartmentOptions.find((apartment) => apartment.id === selectedApartmentId) || null
  const selectedResidents = selectedApartment
    ? residentsByApartment.get(selectedApartment.identifier) || []
    : []

  const togglePanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel))
    if (panel === 'directory') setSelectedApartmentId(null)
  }

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
              ? 'Elige un apartamento para llamar a sus residentes'
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
          <h2>Directorio de apartamentos</h2>
          <p className="muted">
            Elige una vivienda para ver sus residentes y llamarles por el citofono.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="loading-block">
              <span className="spinner" aria-hidden="true" />
              Cargando apartamentos...
            </div>
          )}

          {!loading && !error && apartmentOptions.length === 0 && (
            <EmptyState
              icon={<UsersIcon />}
              title="Sin apartamentos activos"
              description="Cuando administracion registre viviendas apareceran aqui para poder llamar a sus residentes."
            />
          )}

          {!loading && !error && apartmentOptions.length > 0 && !selectedApartment && (
            <div className="apartment-grid">
              {apartmentOptions.map((apartment) => {
                const count = residentsByApartment.get(apartment.identifier)?.length || 0
                const location = [
                  apartment.block,
                  apartment.floor != null ? `Piso ${apartment.floor}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <button
                    key={apartment.id}
                    type="button"
                    className="apartment-button"
                    onClick={() => setSelectedApartmentId(apartment.id)}
                  >
                    <span className="apartment-button-id">{apartment.identifier}</span>
                    <span className="apartment-button-meta">
                      {location || 'Sin datos de ubicacion'}
                    </span>
                    <span className="apartment-button-count">
                      {count === 0
                        ? 'Sin residentes'
                        : count === 1
                          ? '1 residente'
                          : `${count} residentes`}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && !error && selectedApartment && (
            <div className="apartment-detail">
              <div className="apartment-detail-header">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setSelectedApartmentId(null)}
                >
                  ← Volver
                </button>
                <div>
                  <h3>{selectedApartment.identifier}</h3>
                  <p className="muted">
                    {[
                      selectedApartment.block,
                      selectedApartment.floor != null
                        ? `Piso ${selectedApartment.floor}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Sin datos de ubicacion'}
                  </p>
                </div>
              </div>

              {selectedResidents.length === 0 ? (
                <EmptyState
                  icon={<UsersIcon />}
                  title="Sin residentes en esta vivienda"
                  description="Esta vivienda no tiene residentes vinculados en este momento."
                />
              ) : (
                <ul className="call-directory">
                  {selectedResidents.map((resident) => (
                    <li key={resident.id} className="call-directory-item">
                      <div className="call-directory-info">
                        <strong>
                          {resident.firstName} {resident.lastName}
                        </strong>
                        <span className="muted">{resident.email}</span>
                      </div>
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
            </div>
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
          <p>Abre el directorio, elige un apartamento y llama al citofono de sus residentes.</p>
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
