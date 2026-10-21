import { useCallback, useEffect, useState } from 'react'
import { visitsApi } from '../../api/client'
import EmptyState from '../../components/EmptyState'
import { CalendarIcon } from '../../components/icons'

const STATUS_LABELS = {
  PENDING: 'Pendiente de aviso',
  NOTIFIED: 'Avisado',
  ADMITTED: 'Autorizada',
  REJECTED: 'Rechazada',
  CLOSED: 'Finalizada',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

/**
 * Historial de visitas registradas por consergeria para la vivienda del
 * residente. Solo los residentes que residen en el apartamento lo ven.
 */
export default function VisitasCard() {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await visitsApi.mine(0, 20)
      setVisits(page.content || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las visitas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [load])

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h2>Visitas de tu vivienda</h2>
      <p className="muted">
        Visitantes que han llegado al porton de tu vivienda. Consergeria te avisa por el buzon y te
        llama por el interfono.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" />
          Cargando visitas...
        </div>
      )}

      {!loading && visits.length === 0 && !error && (
        <EmptyState
          icon={<CalendarIcon />}
          title="Sin visitas registradas"
          description="Cuando consergeria anote una visita en tu portal aparecera aqui."
        />
      )}

      {!loading && visits.length > 0 && (
        <ul className="notification-list">
          {visits.map((visit) => (
            <li key={visit.id}>
              <div className="call-directory-info">
                <strong>{visit.visitorName}</strong>
                <span className="muted">
                  {formatDate(visit.entryAt)}
                  {visit.visitorCompany ? ` · ${visit.visitorCompany}` : ''}
                  {visit.exitAt ? ` · Salida ${formatDate(visit.exitAt)}` : ''}
                </span>
              </div>
              <span className="badge">{STATUS_LABELS[visit.status] || visit.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
