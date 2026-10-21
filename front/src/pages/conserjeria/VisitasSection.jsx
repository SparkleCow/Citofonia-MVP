import { useCallback, useEffect, useState } from 'react'
import { apartmentsApi, visitsApi } from '../../api/client'
import { useCall } from '../../context/call-context'
import EmptyState from '../../components/EmptyState'
import { CalendarIcon, PhoneIcon, UsersIcon } from '../../components/icons'

const STATUS_LABELS = {
  PENDING: 'Pendiente de aviso',
  NOTIFIED: 'Avisado',
  ADMITTED: 'Autorizada',
  REJECTED: 'Rechazada',
  CLOSED: 'Finalizada',
}

const EMPTY_VISIT = {
  apartmentId: '',
  visitorName: '',
  visitorDocument: '',
  visitorPhone: '',
  visitorCompany: '',
  notes: '',
  entryAt: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

/**
 * Panel de consergeria para las visitas al portal: anotar la visita, avisar
 * por buzon a los residentes que residen en la vivienda y llamarles por el
 * interfono para notificarles.
 */
export default function VisitasSection() {
  const { startCall, startApartmentCall, busy } = useCall()
  const [apartments, setApartments] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [lastVisit, setLastVisit] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_VISIT)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [openVisitId, setOpenVisitId] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [selected, setSelected] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [visitPage, apartmentPage] = await Promise.all([
        visitsApi.list(0, 50),
        apartmentsApi.list(),
      ])
      setVisits(visitPage.content || [])
      setApartments(apartmentPage.content || [])
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

  function updateForm(field) {
    return (event) => {
      const { value } = event.target
      setForm((prev) => ({ ...prev, [field]: value }))
      setFormErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const created = await visitsApi.create({
        apartmentId: form.apartmentId ? Number(form.apartmentId) : null,
        visitorName: form.visitorName.trim(),
        visitorDocument: form.visitorDocument.trim() || null,
        visitorPhone: form.visitorPhone.trim() || null,
        visitorCompany: form.visitorCompany.trim() || null,
        notes: form.notes.trim() || null,
        entryAt: form.entryAt ? new Date(form.entryAt).toISOString() : null,
      })
      setForm(EMPTY_VISIT)
      setFormErrors({})
      setShowForm(false)
      setLastVisit(created)
      setNotice('Visita registrada en el portal')
      await load()
    } catch (err) {
      setError(err.message)
      if (err.fields) setFormErrors(err.fields)
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisit(visit) {
    if (openVisitId === visit.id) {
      setOpenVisitId(null)
      setRecipients([])
      setSelected([])
      return
    }
    setOpenVisitId(visit.id)
    setRecipients([])
    setSelected([])
    setLoadingRecipients(true)
    setError(null)
    try {
      const list = await visitsApi.recipients(visit.apartmentId)
      setRecipients(list)
      setSelected(list.map((resident) => resident.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingRecipients(false)
    }
  }

  function toggleRecipient(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  async function handleNotify(visit) {
    setError(null)
    setSaving(true)
    try {
      await visitsApi.notify(visit.id, selected)
      setNotice(`Aviso de la visita enviado a ${selected.length} residente(s)`)
      setSelected([])
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(visit, status) {
    setError(null)
    setSaving(true)
    try {
      await visitsApi.updateStatus(visit.id, status)
      setNotice(`Visita marcada como ${STATUS_LABELS[status].toLowerCase()}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openVisit = visits.find((visit) => visit.id === openVisitId)

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="page-head">
        <div>
          <h2>Visitas</h2>
          <p className="page-sub">
            Anota los visitantes del portal, avisa a los residentes de la vivienda y llamales para
            notificarles.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm((prev) => !prev)}
        >
          <CalendarIcon />
          {showForm ? 'Cancelar' : 'Registrar visita'}
        </button>
      </div>

      {notice && (
        <div className="alert alert-success">
          {notice}
          {lastVisit && (
            <div className="row-actions" style={{ marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-primary btn-small"
                disabled={busy}
                onClick={() =>
                  startApartmentCall(
                    lastVisit.apartmentId,
                    lastVisit.apartmentIdentifier,
                    { visitId: lastVisit.id },
                  )
                }
              >
                <PhoneIcon />
                Llamar ya al apartamento {lastVisit.apartmentIdentifier}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setLastVisit(null)
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
              setLastVisit(null)
            }}
          >
            x
          </button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form className="panel-form" onSubmit={handleRegister} noValidate>
          <h2>Nueva visita</h2>

          <div className="field-row">
            <label className="field">
              <span>Apartamento</span>
              <select
                value={form.apartmentId}
                onChange={updateForm('apartmentId')}
                required
              >
                <option value="">Selecciona la vivienda visitada</option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.identifier}
                  </option>
                ))}
              </select>
              {formErrors.apartmentId && <em className="field-error">{formErrors.apartmentId}</em>}
            </label>
            <label className="field">
              <span>Hora de entrada</span>
              <input
                type="datetime-local"
                value={form.entryAt}
                onChange={updateForm('entryAt')}
              />
              <em className="field-hint">Si lo dejas vacio se registra la hora actual.</em>
            </label>
          </div>

          <label className="field">
            <span>Nombre del visitante</span>
            <input
              type="text"
              value={form.visitorName}
              onChange={updateForm('visitorName')}
              placeholder="Nombre y apellidos"
              required
            />
            {formErrors.visitorName && <em className="field-error">{formErrors.visitorName}</em>}
          </label>

          <div className="field-row">
            <label className="field">
              <span>Documento</span>
              <input
                type="text"
                value={form.visitorDocument}
                onChange={updateForm('visitorDocument')}
                placeholder="Opcional"
              />
            </label>
            <label className="field">
              <span>Telefono</span>
              <input
                type="tel"
                value={form.visitorPhone}
                onChange={updateForm('visitorPhone')}
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="field">
            <span>Empresa o relacion</span>
            <input
              type="text"
              value={form.visitorCompany}
              onChange={updateForm('visitorCompany')}
              placeholder="Opcional (p. ej. Fontaneria Ruiz)"
            />
          </label>

          <label className="field">
            <span>Motivo y observaciones</span>
            <textarea
              value={form.notes}
              onChange={updateForm('notes')}
              placeholder="Motivo de la visita y notas internas"
              rows={3}
              maxLength={500}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? 'Guardando...' : 'Guardar visita'}
          </button>
        </form>
      )}

      {loading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" />
          Cargando visitas...
        </div>
      )}

      {!loading && visits.length === 0 && (
        <EmptyState
          icon={<UsersIcon />}
          title="Sin visitas registradas"
          description="Cuando alguien llame al porton, pulsa 'Registrar visita' para anotarlo y avisar al resident."
        />
      )}

      {!loading && visits.length > 0 && (
        <ul className="notification-list">
          {visits.map((visit) => (
            <li key={visit.id}>
              <div className="call-directory-info">
                <strong>{visit.visitorName}</strong>
                <span className="muted">
                  {visit.apartmentIdentifier} · {formatDate(visit.entryAt)}
                  {visit.visitorCompany ? ` · ${visit.visitorCompany}` : ''}
                </span>
              </div>
              <span className="badge">{STATUS_LABELS[visit.status] || visit.status}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => toggleVisit(visit)}
                >
                  {openVisitId === visit.id ? 'Ocultar' : 'Gestionar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && openVisit && (
        <div className="panel-form" style={{ marginTop: '16px' }}>
          <h2>Visita a {openVisit.apartmentIdentifier}</h2>
          <div className="muted">
            <div>
              Visitante: <strong>{openVisit.visitorName}</strong>
              {openVisit.visitorDocument ? ` · ${openVisit.visitorDocument}` : ''}
              {openVisit.visitorPhone ? ` · ${openVisit.visitorPhone}` : ''}
            </div>
            {openVisit.notes && <div>Motivo: {openVisit.notes}</div>}
            <div>
              Estado: {STATUS_LABELS[openVisit.status] || openVisit.status}
              {openVisit.notifiedAt
                ? ` · Avisado el ${formatDate(openVisit.notifiedAt)}`
                : ' · Todavia sin avisar'}
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Acciones</h3>
            <div className="row-actions">
              {openVisit.status !== 'ADMITTED' && (
                <button
                  type="button"
                  className="btn btn-success btn-small"
                  disabled={saving}
                  onClick={() => handleStatus(openVisit, 'ADMITTED')}
                >
                  Autorizada
                </button>
              )}
              {openVisit.status !== 'REJECTED' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={saving}
                  onClick={() => handleStatus(openVisit, 'REJECTED')}
                >
                  Rechazada
                </button>
              )}
              {openVisit.status !== 'CLOSED' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={saving}
                  onClick={() => handleStatus(openVisit, 'CLOSED')}
                >
                  Salida registrada
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
                No hay residentes residiendo en esta vivienda: no pueden recibir el aviso de la visita.
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
                    onClick={() => handleNotify(openVisit)}
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
                disabled={busy || recipients.length === 0}
                onClick={() =>
                  startApartmentCall(
                    openVisit.apartmentId,
                    openVisit.apartmentIdentifier,
                    { visitId: openVisit.id },
                  )
                }
              >
                <PhoneIcon />
                Llamar a todo el apartamento {openVisit.apartmentIdentifier}
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
                    onClick={() => startCall(resident, { visitId: openVisit.id })}
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
