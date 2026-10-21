import { useCallback, useEffect, useState } from 'react'
import { apartmentsApi, correspondenceApi } from '../../api/client'
import { useCall } from '../../context/call-context'
import EmptyState from '../../components/EmptyState'
import { InboxIcon, PhoneIcon } from '../../components/icons'

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

const EMPTY_ITEM = {
  apartmentId: '',
  type: 'PAQUETE',
  description: '',
  carrier: '',
  trackingNumber: '',
  recipientId: '',
  delivery: 'PORTERIA',
  receivedAt: '',
  notes: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

/**
 * Panel de consergeria para la correspondencia del portal: anotar que se ha
 * recibido, para quien es dentro de la vivienda, avisar por buzon, llamar por
 * el interfono y decidir si queda en porteria para que la recojan.
 */
export default function CorrespondenciaSection() {
  const { startCall, startApartmentCall, busy } = useCall()
  const [apartments, setApartments] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [lastItem, setLastItem] = useState(null)
  const [lastRecipient, setLastRecipient] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_ITEM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [selected, setSelected] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [page, apartmentPage] = await Promise.all([
        correspondenceApi.list(0, 50),
        apartmentsApi.list(),
      ])
      setItems(page.content || [])
      setApartments(apartmentPage.content || [])
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

  function updateForm(field) {
    return (event) => {
      const { value } = event.target
      setForm((prev) => ({ ...prev, [field]: value }))
      setFormErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
    }
  }

  async function loadRecipients(apartmentId, onLoaded) {
    if (!apartmentId) {
      setRecipients([])
      onLoaded?.([])
      return
    }
    setLoadingRecipients(true)
    try {
      const list = await correspondenceApi.recipients(apartmentId)
      setRecipients(list)
      onLoaded?.(list)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los residentes de la vivienda')
    } finally {
      setLoadingRecipients(false)
    }
  }

  async function handleApartmentChange(event) {
    const { value } = event.target
    setForm((prev) => ({ ...prev, apartmentId: value, recipientId: '' }))
    setFormErrors((prev) => (prev.apartmentId ? { ...prev, apartmentId: null } : prev))
    await loadRecipients(value)
  }

  async function handleRegister(event) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const created = await correspondenceApi.create({
        apartmentId: form.apartmentId ? Number(form.apartmentId) : null,
        type: form.type,
        description: form.description.trim() || null,
        carrier: form.carrier.trim() || null,
        trackingNumber: form.trackingNumber.trim() || null,
        recipientId: form.recipientId ? Number(form.recipientId) : null,
        delivery: form.delivery,
        receivedAt: form.receivedAt ? new Date(form.receivedAt).toISOString() : null,
        notes: form.notes.trim() || null,
      })
      setForm(EMPTY_ITEM)
      setFormErrors({})
      setShowForm(false)
      setLastItem(created)
      setLastRecipient(recipients.find((resident) => resident.id === created.recipientId) || null)
      setNotice('Correspondencia registrada')
      await load()
    } catch (err) {
      setError(err.message)
      if (err.fields) setFormErrors(err.fields)
    } finally {
      setSaving(false)
    }
  }

  async function toggleItem(item) {
    if (openId === item.id) {
      setOpenId(null)
      setRecipients([])
      setSelected([])
      return
    }
    setOpenId(item.id)
    setRecipients([])
    setSelected([])
    await loadRecipients(item.apartmentId, (list) => setSelected(list.map((resident) => resident.id)))
  }

  function toggleRecipient(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  async function handleNotify(item) {
    setError(null)
    setSaving(true)
    try {
      await correspondenceApi.notify(item.id, selected)
      setNotice(`Aviso de la correspondencia enviado a ${selected.length} residente(s)`)
      setSelected([])
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleHold(item) {
    setError(null)
    setSaving(true)
    try {
      await correspondenceApi.holdAtDesk(item.id)
      setNotice('Correspondencia guardada en porteria: avisado a los residentes de la vivienda')
      setLastItem(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(item, status) {
    setError(null)
    setSaving(true)
    try {
      await correspondenceApi.updateStatus(item.id, status)
      setNotice(`Correspondencia marcada como ${STATUS_LABELS[status].toLowerCase()}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openItem = items.find((item) => item.id === openId)

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="page-head">
        <div>
          <h2>Correspondencia</h2>
          <p className="page-sub">
            Anota los paquetes y cartas que llegan al porton, para quien es de cada vivienda y si queda
            en porteria para que lo recojan.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <InboxIcon />
          {showForm ? 'Cancelar' : 'Registrar correspondencia'}
        </button>
      </div>

      {notice && (
        <div className="alert alert-success">
          {notice}
          {lastItem && (
            <div className="row-actions" style={{ marginTop: '10px' }}>
              {lastRecipient ? (
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  disabled={busy}
                  onClick={() =>
                    startCall(lastRecipient, { correspondenceId: lastItem.id })
                  }
                >
                  <PhoneIcon />
                  Llamar ya a {lastRecipient.firstName} {lastRecipient.lastName}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  disabled={busy}
                  onClick={() =>
                    startApartmentCall(
                      lastItem.apartmentId,
                      lastItem.apartmentIdentifier,
                      { correspondenceId: lastItem.id },
                    )
                  }
                >
                  <PhoneIcon />
                  Llamar ya al apartamento {lastItem.apartmentIdentifier}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={saving}
                onClick={() => handleHold(lastItem)}
              >
                Recibir en porteria
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setLastItem(null)
                  setLastRecipient(null)
                  setNotice(null)
                }}
              >
                Cerrar
              </button>
            </div>
          )}
          <button
            type="button"
            className="alert-close"
            aria-label="Cerrar aviso"
            onClick={() => {
              setNotice(null)
              setLastItem(null)
              setLastRecipient(null)
            }}
          >
            x
          </button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="panel-form" onSubmit={handleRegister} noValidate>
          <h2>Nueva correspondencia</h2>

          <div className="field-row">
            <label className="field">
              <span>Apartamento</span>
              <select
                value={form.apartmentId}
                onChange={handleApartmentChange}
                required
              >
                <option value="">Selecciona la vivienda destinataria</option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.identifier}
                  </option>
                ))}
              </select>
              {formErrors.apartmentId && <em className="field-error">{formErrors.apartmentId}</em>}
            </label>
            <label className="field">
              <span>Que es</span>
              <select value={form.type} onChange={updateForm('type')}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Descripcion</span>
            <input
              type="text"
              value={form.description}
              onChange={updateForm('description')}
              placeholder="Caja pequena de ropa"
              maxLength={200}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Transportista</span>
              <input
                type="text"
                value={form.carrier}
                onChange={updateForm('carrier')}
                placeholder="Opcional (p. ej. SEUR)"
                maxLength={120}
              />
            </label>
            <label className="field">
              <span>Numero de seguimiento</span>
              <input
                type="text"
                value={form.trackingNumber}
                onChange={updateForm('trackingNumber')}
                placeholder="Opcional"
                maxLength={64}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Para quien es</span>
              <select
                value={form.recipientId}
                onChange={updateForm('recipientId')}
                disabled={!form.apartmentId || loadingRecipients}
              >
                <option value="">La vivienda en general</option>
                {recipients.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.firstName} {resident.lastName}
                  </option>
                ))}
              </select>
              <em className="field-hint">
                Solo los residentes que residen en la vivienda pueden ser destinatarios.
              </em>
            </label>
            <label className="field">
              <span>Entrega</span>
              <select value={form.delivery} onChange={updateForm('delivery')}>
                <option value="PORTERIA">Queda en porteria</option>
                <option value="APARTAMENTO">Se sube a la vivienda</option>
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Fecha de recepcion</span>
              <input
                type="datetime-local"
                value={form.receivedAt}
                onChange={updateForm('receivedAt')}
              />
              <em className="field-hint">Si lo dejas vacio se registra la hora actual.</em>
            </label>
          </div>

          <label className="field">
            <span>Observaciones</span>
            <textarea
              value={form.notes}
              onChange={updateForm('notes')}
              placeholder="Notas internas de consergeria"
              rows={3}
              maxLength={500}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? 'Guardando...' : 'Guardar correspondencia'}
          </button>
        </form>
      )}

      {loading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" />
          Cargando correspondencia...
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<InboxIcon />}
          title="Sin correspondencia registrada"
          description="Cuando llegue un paquete o una carta al porton, pulsa 'Registrar correspondencia' para anotarlo."
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
                  {item.apartmentIdentifier} · {formatDate(item.receivedAt)}
                  {item.carrier ? ` · ${item.carrier}` : ''}
                </span>
              </div>
              <span className="badge">{STATUS_LABELS[item.status] || item.status}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => toggleItem(item)}
                >
                  {openId === item.id ? 'Ocultar' : 'Gestionar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && openItem && (
        <div className="panel-form" style={{ marginTop: '16px' }}>
          <h2>Correspondencia en {openItem.apartmentIdentifier}</h2>
          <div className="muted">
            <div>
              Que es: <strong>{openItem.description || TYPE_LABELS[openItem.type]}</strong>
              {openItem.carrier ? ` · ${openItem.carrier}` : ''}
              {openItem.trackingNumber ? ` · ${openItem.trackingNumber}` : ''}
            </div>
            <div>
              Destinatario: {openItem.recipientName || 'la vivienda en general'} · Entrega:{' '}
              {DELIVERY_LABELS[openItem.delivery] || openItem.delivery}
            </div>
            <div>
              Estado: {STATUS_LABELS[openItem.status] || openItem.status}
              {openItem.notifiedAt
                ? ` · Avisada el ${formatDate(openItem.notifiedAt)}`
                : ' · Todavia sin avisar'}
              {openItem.collectedAt ? ` · Entregada el ${formatDate(openItem.collectedAt)}` : ''}
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Acciones</h3>
            <div className="row-actions">
              {openItem.delivery !== 'PORTERIA' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={saving}
                  onClick={() => handleHold(openItem)}
                >
                  Dejar en porteria
                </button>
              )}
              {openItem.status !== 'DELIVERED' && (
                <button
                  type="button"
                  className="btn btn-success btn-small"
                  disabled={saving}
                  onClick={() => handleStatus(openItem, 'DELIVERED')}
                >
                  Entregada
                </button>
              )}
              {openItem.status !== 'RETURNED' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={saving}
                  onClick={() => handleStatus(openItem, 'RETURNED')}
                >
                  Devuelta
                </button>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Residentes de la vivienda</h3>
            {loadingRecipients && (
              <div className="loading-block">
                <span className="spinner" aria-hidden="true" />
                Cargando residentes...
              </div>
            )}
            {!loadingRecipients && recipients.length === 0 && (
              <p className="muted">
                No hay residentes residiendo en esta vivienda: no pueden recibir el aviso.
              </p>
            )}
            {!loadingRecipients && recipients.length > 0 && (
              <>
                <div className="recipient-picker">
                  {recipients.map((resident) => (
                    <label key={resident.id} className="check-row check-compact">
                      <input
                        type="checkbox"
                        checked={selected.includes(resident.id)}
                        onChange={() => toggleRecipient(resident.id)}
                      />
                      <span>
                        {resident.firstName} {resident.lastName}
                        <span className="check-sub">
                          {resident.email}
                          {resident.owner ? ' · propietario' : ' · inquilino'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    disabled={saving || selected.length === 0}
                    onClick={() => handleNotify(openItem)}
                  >
                    Enviar aviso a los seleccionados
                  </button>
                </div>
              </>
            )}
          </div>

          {!loadingRecipients && recipients.length > 0 && (
            <div className="form-section">
              <h3 className="form-section-title">Llamar para notificar</h3>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  disabled={busy}
                  onClick={() =>
                    startApartmentCall(
                      openItem.apartmentId,
                      openItem.apartmentIdentifier,
                      { correspondenceId: openItem.id },
                    )
                  }
                >
                  <PhoneIcon />
                  Llamar a todo el apartamento {openItem.apartmentIdentifier}
                </button>
              </div>
              <div className="recipient-picker">
                {recipients.map((resident) => (
                  <div key={resident.id} className="call-directory-item">
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
                      onClick={() => startCall(resident, { correspondenceId: openItem.id })}
                    >
                      <PhoneIcon />
                      Llamar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
