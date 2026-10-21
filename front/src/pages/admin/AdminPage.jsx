import { useCallback, useEffect, useMemo, useState } from 'react'
import { apartmentsApi, mailApi, usersApi } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import EmptyState from '../../components/EmptyState'
import PasswordField from '../../components/PasswordField'
import { SearchIcon, UsersIcon } from '../../components/icons'

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  CONCIERGE: 'Conserje',
  USER: 'Residente',
}

const EMPTY_USER = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentNumber: '',
  password: '',
  roles: ['CONCIERGE'],
}

const EMPTY_COMPOSE = {
  subject: '',
  body: '',
  audience: 'ALL',
  recipientIds: [],
}

const AUDIENCE_LABELS = {
  ALL: 'Todos los usuarios',
  RESIDENTS: 'Solo residentes',
  CONCIERGE: 'Solo conserjeria',
  CUSTOM: 'Elegir destinatarios',
}

function matches(user, term) {
  if (!term) return true
  const t = term.toLowerCase()
  return (
    `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(t) ||
    (user.email || '').toLowerCase().includes(t) ||
    (user.phone || '').toLowerCase().includes(t) ||
    (user.apartmentIdentifier || '').toLowerCase().includes(t)
  )
}

function isResident(user) {
  return (user.roles || []).includes('USER')
}

function HousingBadges({ user }) {
  if (!isResident(user)) return <span className="muted">—</span>
  if (!user.apartmentIdentifier) return <span className="badge badge-plain">sin vivienda</span>
  return (
    <>
      <span className="badge">{user.apartmentIdentifier}</span>
      <span className={`badge ${user.owner ? 'badge-ok' : 'badge-plain'}`}>
        {user.owner ? 'propietario' : 'inquilino'}
      </span>
      {user.owner && !user.occupiesApartment && (
        <span className="badge badge-warn">no vive aqui</span>
      )}
    </>
  )
}

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  const [form, setForm] = useState(EMPTY_USER)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apartments, setApartments] = useState([])
  const [compose, setCompose] = useState(EMPTY_COMPOSE)
  const [composeErrors, setComposeErrors] = useState({})
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [usersPage, pendingPage, apartmentList] = await Promise.all([
        usersApi.list(),
        usersApi.pending(),
        apartmentsApi.options(),
      ])
      setUsers(usersPage.content || [])
      setPending(pendingPage.content || [])
      setApartments(Array.isArray(apartmentList) ? apartmentList : [])
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [load])

  const filteredUsers = useMemo(() => users.filter((u) => matches(u, search)), [users, search])
  const filteredPending = useMemo(
    () => pending.filter((u) => matches(u, search)),
    [pending, search],
  )

  function updateForm(field) {
    return (event) => {
      const { value } = event.target
      setForm((prev) => ({ ...prev, [field]: value }))
      setFormErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    setFormErrors({})
    setError(null)
    setSaving(true)
    try {
      await usersApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        documentNumber: form.documentNumber.trim() || null,
        password: form.password,
        roles: ['CONCIERGE'],
      })
      setForm(EMPTY_USER)
      setNotice(`Cuenta de ${form.firstName} ${form.lastName} creada y habilitada`)
      await load()
      setTab('users')
    } catch (err) {
      setError(err.message)
      if (err.fields) setFormErrors(err.fields)
    } finally {
      setSaving(false)
    }
  }

  function updateCompose(field) {
    return (event) => {
      const { value } = event.target
      setCompose((prev) => ({ ...prev, [field]: value }))
      setComposeErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
    }
  }

  function toggleRecipient(id) {
    setCompose((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.includes(id)
        ? prev.recipientIds.filter((x) => x !== id)
        : [...prev.recipientIds, id],
    }))
    setComposeErrors((prev) => ({ ...prev, recipientIds: null }))
  }

  async function handleSend(event) {
    event.preventDefault()
    setComposeErrors({})
    setError(null)
    if (compose.audience === 'CUSTOM' && compose.recipientIds.length === 0) {
      setComposeErrors({ recipientIds: 'Selecciona al menos un destinatario' })
      return
    }
    setSending(true)
    try {
      const result = await mailApi.send({
        subject: compose.subject.trim(),
        body: compose.body.trim(),
        audience: compose.audience,
        recipientIds: compose.audience === 'CUSTOM' ? compose.recipientIds : null,
      })
      setCompose(EMPTY_COMPOSE)
      setNotice(
        `Mensaje "${result.subject}" enviado a ${result.recipientCount} buzon${result.recipientCount === 1 ? '' : 'es'}`,
      )
    } catch (err) {
      setError(err.message)
      if (err.fields) setComposeErrors(err.fields)
    } finally {
      setSending(false)
    }
  }

  async function handleEnable(user) {
    setError(null)
    setBusyId(user.id)
    try {
      await usersApi.enable(user.id)
      setNotice(`${user.firstName} ${user.lastName} habilitado: ya puede iniciar sesion`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDisable(user) {
    const ok = window.confirm(
      `¿Deshabilitar la cuenta de ${user.firstName} ${user.lastName}? Dejara de poder iniciar sesion sin perder sus datos.`,
    )
    if (!ok) return
    setError(null)
    setBusyId(user.id)
    try {
      await usersApi.disable(user.id)
      setNotice(`${user.firstName} ${user.lastName} deshabilitado`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleApartmentChange(user, value) {
    setError(null)
    setBusyId(user.id)
    try {
      await usersApi.assignApartment(user.id, value ? Number(value) : null)
      const label = apartments.find((a) => String(a.id) === String(value))?.identifier
      setNotice(
        label
          ? `${user.firstName} ${user.lastName} vinculado a ${label}`
          : `${user.firstName} ${user.lastName} se ha quedado sin vivienda`,
      )
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleHousingChange(user, patch) {
    setError(null)
    setBusyId(user.id)
    try {
      await usersApi.updateHousing(user.id, patch)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const hasSearch = search.trim().length > 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Administracion</h1>
          <p className="page-sub">
            Gestiona los usuarios del edificio, aprueba registros de residentes y crea cuentas de
            conserjeria.
          </p>
        </div>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'users'}
            className={`tab ${tab === 'users' ? 'tab-active' : ''}`}
            onClick={() => setTab('users')}
          >
            Usuarios ({users.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pending'}
            className={`tab ${tab === 'pending' ? 'tab-active' : ''}`}
            onClick={() => setTab('pending')}
          >
            Pendientes ({pending.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={`tab ${tab === 'create' ? 'tab-active' : ''}`}
            onClick={() => setTab('create')}
          >
            Nuevo usuario
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'compose'}
            className={`tab ${tab === 'compose' ? 'tab-active' : ''}`}
            onClick={() => setTab('compose')}
          >
            Enviar mensaje
          </button>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success">
          {notice}
          <button
            type="button"
            className="alert-close"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
          >
            x
          </button>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" />
          Cargando usuarios...
        </div>
      )}

      {!loading && tab === 'create' && (
        <form onSubmit={handleCreate} className="panel-form" noValidate>
          <h2>Crear usuario de conserjeria</h2>
          <p className="muted">
            La cuenta se crea <strong>habilitada</strong> con rol conserjeria, porque la verificacion
            la realiza el propio administrador. El registro de residentes se hace desde la pagina
            publica con el codigo del edificio.
          </p>

          <div className="field-row">
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                value={form.firstName}
                onChange={updateForm('firstName')}
                placeholder="Nombre de la persona"
                required
              />
              {formErrors.firstName && <em className="field-error">{formErrors.firstName}</em>}
            </label>
            <label className="field">
              <span>Apellido</span>
              <input
                type="text"
                value={form.lastName}
                onChange={updateForm('lastName')}
                placeholder="Apellidos"
                required
              />
              {formErrors.lastName && <em className="field-error">{formErrors.lastName}</em>}
            </label>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={updateForm('email')}
              placeholder="ejemplo@correo.com"
              autoComplete="off"
              required
            />
            {formErrors.email ? (
              <em className="field-error">{formErrors.email}</em>
            ) : (
              <em className="field-hint">Sera su usuario para iniciar sesion.</em>
            )}
          </label>

          <div className="field-row">
            <label className="field">
              <span>Telefono</span>
              <input
                type="tel"
                value={form.phone}
                onChange={updateForm('phone')}
                placeholder="+34 600 111 222"
              />
              {formErrors.phone && <em className="field-error">{formErrors.phone}</em>}
            </label>
            <label className="field">
              <span>
                Documento <span className="optional">(opcional)</span>
              </span>
              <input
                type="text"
                value={form.documentNumber}
                onChange={updateForm('documentNumber')}
                placeholder="12345678A"
              />
              {formErrors.documentNumber && (
                <em className="field-error">{formErrors.documentNumber}</em>
              )}
            </label>
          </div>

          <PasswordField
            label="Contrasena"
            value={form.password}
            onChange={updateForm('password')}
            placeholder="Minimo 8 caracteres"
            autoComplete="new-password"
            minLength={8}
            required
            error={formErrors.password}
            hint={formErrors.password ? null : 'Se guarda cifrada; no volvera a poder verse.'}
          />

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner" aria-hidden="true" />}
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      )}

      {!loading && tab === 'compose' && (
        <form onSubmit={handleSend} className="panel-form" noValidate>
          <h2>Enviar mensaje al buzon</h2>
          <p className="muted">
            El mensaje aterriza en el <strong>buzon</strong> de cada destinatario y, si tiene la
            sesion abierta, recibe el aviso en tiempo real.
          </p>

          <label className="field">
            <span>Asunto</span>
            <input
              type="text"
              value={compose.subject}
              onChange={updateCompose('subject')}
              placeholder="P. ej. Corte de agua el martes"
              maxLength={160}
              required
            />
            {composeErrors.subject && <em className="field-error">{composeErrors.subject}</em>}
          </label>

          <label className="field">
            <span>Mensaje</span>
            <textarea
              value={compose.body}
              onChange={updateCompose('body')}
              placeholder="Escribe aqui el comunicado para los usuarios..."
              rows={6}
              maxLength={4000}
              required
            />
            {composeErrors.body && <em className="field-error">{composeErrors.body}</em>}
          </label>

          <fieldset className="compose-audience">
            <legend>Destinatarios</legend>
            {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
              <label key={value} className="check-row check-compact">
                <input
                  type="radio"
                  name="audience"
                  value={value}
                  checked={compose.audience === value}
                  onChange={updateCompose('audience')}
                />
                <span>{label}</span>
              </label>
            ))}
            {composeErrors.recipientIds && (
              <em className="field-error">{composeErrors.recipientIds}</em>
            )}
          </fieldset>

          {compose.audience === 'CUSTOM' && (
            <div className="recipient-picker">
              {users.length === 0 ? (
                <p className="muted">No hay usuarios disponibles.</p>
              ) : (
                users.map((u) => (
                  <label key={u.id} className="check-row check-compact">
                    <input
                      type="checkbox"
                      checked={compose.recipientIds.includes(u.id)}
                      onChange={() => toggleRecipient(u.id)}
                    />
                    <span>
                      {u.firstName} {u.lastName}
                      <span className="check-sub">{u.email}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending && <span className="spinner" aria-hidden="true" />}
            {sending ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </form>
      )}

      {!loading && (tab === 'users' || tab === 'pending') && (
        <>
          <div className="toolbar">
            <div className="search">
              <SearchIcon />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email o telefono..."
                aria-label="Buscar usuarios"
              />
            </div>
            <span className="muted">
              {tab === 'users'
                ? `${filteredUsers.length} de ${users.length} usuarios`
                : `${filteredPending.length} de ${pending.length} pendientes`}
            </span>
          </div>

          {tab === 'users' &&
            (filteredUsers.length === 0 ? (
              <EmptyState
                icon={<UsersIcon />}
                title={hasSearch ? 'Sin resultados' : 'No hay usuarios registrados'}
                description={
                  hasSearch
                    ? 'Ningun usuario coincide con tu busqueda. Prueba con otro nombre, email o telefono.'
                    : 'Crea cuentas de conserjeria desde "Nuevo usuario" y habilita residentes desde "Pendientes".'
                }
                action={
                  hasSearch ? (
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setSearch('')}>
                      Limpiar busqueda
                    </button>
                  ) : null
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Telefono</th>
                      <th>Roles</th>
                      <th>Vivienda y condicion</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className={!u.enabled ? 'row-disabled' : ''}>
                        <td className="cell-name">
                          {u.firstName} {u.lastName}
                          {u.id === currentUser?.id && <span className="badge badge-plain">tu</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          {u.roles.map((r) => (
                            <span key={r} className="badge">
                              {ROLE_LABELS[r] || r}
                            </span>
                          ))}
                        </td>
                        <td>
                          {isResident(u) ? (
                            <>
                              <select
                                className="inline-select"
                                value={u.apartmentId ?? ''}
                                disabled={busyId === u.id}
                                aria-label={`Apartamento de ${u.firstName} ${u.lastName}`}
                                onChange={(e) => handleApartmentChange(u, e.target.value)}
                              >
                                <option value="">Sin vivienda</option>
                                {apartments.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.identifier}
                                  </option>
                                ))}
                              </select>
                              {u.apartmentId != null && (
                                <>
                                  <label className="check-row check-compact">
                                    <input
                                      type="checkbox"
                                      checked={u.owner}
                                      disabled={busyId === u.id}
                                      onChange={(e) =>
                                        handleHousingChange(u, { owner: e.target.checked })
                                      }
                                    />
                                    <span>Propietario</span>
                                  </label>
                                  <label className="check-row check-compact">
                                    <input
                                      type="checkbox"
                                      checked={u.occupiesApartment}
                                      disabled={busyId === u.id || !u.owner}
                                      onChange={(e) =>
                                        handleHousingChange(u, {
                                          occupiesApartment: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>
                                      Vive aqui{!u.owner ? ' (siempre, es inquilino)' : ''}
                                    </span>
                                  </label>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`status ${u.enabled ? 'status-on' : 'status-off'}`}>
                            {u.enabled ? 'Habilitado' : 'Deshabilitado'}
                          </span>
                        </td>
                        <td className="row-actions">
                          {u.enabled ? (
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() => handleDisable(u)}
                              disabled={busyId === u.id || u.id === currentUser?.id}
                            >
                              Deshabilitar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-small btn-primary"
                              onClick={() => handleEnable(u)}
                              disabled={busyId === u.id}
                            >
                              Habilitar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'pending' &&
            (filteredPending.length === 0 ? (
              <EmptyState
                title={hasSearch ? 'Sin resultados' : 'No hay cuentas pendientes'}
                description={
                  hasSearch
                    ? 'Ningun registro pendiente coincide con tu busqueda.'
                    : 'Los residentes que se registren con el codigo del edificio apareceran aqui para que los habilites.'
                }
                action={
                  hasSearch ? (
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setSearch('')}>
                      Limpiar busqueda
                    </button>
                  ) : null
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Telefono</th>
                      <th>Vivienda</th>
                      <th>Registro</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPending.map((u) => (
                      <tr key={u.id}>
                        <td className="cell-name">
                          {u.firstName} {u.lastName}
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          <HousingBadges user={u} />
                        </td>
                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn btn-small btn-primary"
                            onClick={() => handleEnable(u)}
                            disabled={busyId === u.id}
                          >
                            Habilitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )          )}
        </>
      )}
    </div>
  )
}
