import { useCallback, useEffect, useState } from 'react'
import { correspondenceApi } from '../../api/client'
import EmptyState from '../../components/EmptyState'
import { InboxIcon } from '../../components/icons'

const TYPE_LABELS = {
  PAQUETE: 'Paquete',
  CARTA: 'Carta',
  DOCUMENTO: 'Documento',
  OTRO: 'Otro',
}

const STATUS_LABELS = {
  PENDING: 'Pendiente de aviso',
  NOTIFIED: 'Avisada',
  DELIVERED: 'Entregada',
  RETURNED: 'Devuelta',
}

const DELIVERY_LABELS = {
  APARTAMENTO: 'En la vivienda',
  PORTERIA: 'En porteria',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

/**
 * Correspondencia registrada por consergeria para la vivienda del residente.
 * Solo los residentes que residen en el apartamento lo ven.
 */
export default function CorrespondenciaCard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await correspondenceApi.mine(0, 20)
      setItems(page.content || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudo cargar la correspondencia')
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
      <h2>Correspondencia de tu vivienda</h2>
      <p className="muted">
        Paquetes, cartas y documentos que han llegado al porton para tu vivienda. Si queda en
        porteria, avisamos por el buzon para que pases a recogerlo.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" />
          Cargando correspondencia...
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <EmptyState
          icon={<InboxIcon />}
          title="Sin correspondencia"
          description="Cuando consergeria anote un paquete o una carta para tu vivienda aparecera aqui."
        />
      )}

      {!loading && items.length > 0 && (
        <ul className="notification-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className="call-directory-info">
                <strong>
                  {item.description || TYPE_LABELS[item.type] || item.type}
                  {item.recipientName ? ` · ${item.recipientName}` : ''}
                </strong>
                <span className="muted">
                  {formatDate(item.receivedAt)}
                  {item.carrier ? ` · ${item.carrier}` : ''}
                  {` · ${DELIVERY_LABELS[item.delivery] || item.delivery}`}
                </span>
              </div>
              <span className="badge">{STATUS_LABELS[item.status] || item.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
