import { useCallback, useEffect, useMemo, useState } from 'react'
import { apartmentsApi, callsApi, mailApi, usersApi } from '../../api/client'
import { useAuth } from '../../context/auth-context'
import { useCall } from '../../context/call-context'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import PasswordField from '../../components/PasswordField'
import { PhoneIcon, SearchIcon, UsersIcon } from '../../components/icons'

const PAGE_SIZE = 20

const ROLE_LABELS = {
  ADMIN: 'Administracion',
  CONCIERGE: 'Conserje',
  USER: 'Residente',
}

const ROLE_OPTIONS = ['ADMIN', 'CONCIERGE', 'USER']

const EMPTY_USER = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentNumber: '',
  password: '',
  roles: ['CONCIERGE'],
}

const EMPTY_EDIT = {
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentNumber: '',
  roles: [],
  apartmentId: '',
  owner: false,
  occupiesApartment: true,
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
  const { startCall, startApartmentCall, busy: callBusy, call } = useCall()

  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [usersPage, setUsersPage] = useState(0)
  const [usersTotalPages, setUsersTotalPages] = useState(0)
  const [usersTotal, setUsersTotal] = useState(0)
  const [pending, setPending] = useState([])
  const [pendingPage, setPendingPage] = useState(0)
  const [pendingTotalPages, setPendingTotalPages] = useState(0)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
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

  const [edit, setEdit] = useState(EMPTY_EDIT)
  const [editErrors, setEditErrors] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [staff, setStaff] = useState([])
  const [callApartments, setCallApartments] = useState([])
  const [selectedApartment, setSelectedApartment] = useState('')
  const [apartmentResidents, setApartmentResidents] = useState([])
  const [residentsLoading, setResidentsLoading] = useState(false)

  const loadUsers = useCallback(async (pageIndex) => {
    const target = Math.max(pageIndex || 0, 0)
    setListLoading(true)
    try {
      const data = await usersApi.list(target, PAGE_SIZE)
      const meta = data?.page || {}
      setUsers(data?.content || [])
      setUsersTotal(meta.totalElements ?? data?.content?.length ?? 0)
      setUsersTotalPages(meta.totalPages ?? 1)
      setUsersPage(meta.number ?? target)
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios')
    } finally {
      setListLoading(false)
    }
  }, [])

  const loadPending = useCallback(async (pageIndex) => {
    const target = Math.max(pageIndex || 0, 0)
    setListLoading(true)
    try {
      const data = await usersApi.pending(target, PAGE_SIZE)
      const meta = data?.page || {}
      setPending(data?.content || [])
      setPendingTotal(meta.totalElements ?? data?.content?.length ?? 0)
      setPendingTotalPages(meta.totalPages ?? 1)
      setPendingPage(meta.number ?? target)
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las cuentas pendientes')
    } finally {
      setListLoading(false)
    }
  }, [])

  const refreshLists = useCallback(async () => {
    await Promise.all([loadUsers(usersPage), loadPending(pendingPage)])
  }, [loadUsers, loadPending, usersPage, pendingPage])

  useEffect(() => {
    ;(async () => {
      try {
        const apartmentList = await apartmentsApi.options()
        setApartments(Array.isArray(apartmentList) ? apartmentList : [])
      } catch {
        /* el selector de vivienda se queda vacio */
      }
      await Promise.all([loadUsers(0), loadPending(0)])
      setLoading(false)
    })()
  }, [loadUsers, loadPending])

  const filteredUsers = useMemo(() => users.filter((u) => matches(u, search)), [users, search])
  const filteredPending = useMemo(
    () => pending.filter((u) => matches(u, search)),
    [pending, search],
  )

  const staffMembers = useMemo(
    () => staff.filter((member) => member.email !== currentUser?.email),
    [staff, currentUser],
  )

  const selectedApartmentOption = useMemo(
    () => callApartments.find((a) => String(a.id) === String(selectedApartment)),
    [callApartments, selectedApartment],
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
      await refreshLists()
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
      await refreshLists()
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
      await refreshLists()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(user) {
    const ok = window.confirm(
      `¿Eliminar la cuenta de ${user.firstName} ${user.lastName}? Dejara de poder iniciar sesion y no apareceran mas en los listados, pero sus datos se conservan.`,
    )
    if (!ok) return
    setError(null)
    setBusyId(user.id)
    try {
      await usersApi.remove(user.id)
      setNotice(`${user.firstName} ${user.lastName} eliminado`)
      if (edit.id === user.id) setEdit(EMPTY_EDIT)
      const targetPage = users.length === 1 && usersPage > 0 ? usersPage - 1 : usersPage
      const targetPendingPage =
        pending.length === 1 && pendingPage > 0 ? pendingPage - 1 : pendingPage
      await Promise.all([loadUsers(targetPage), loadPending(targetPendingPage)])
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
      await refreshLists()
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
      await refreshLists()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function openEdit(user) {
    setEditErrors({})
    setEdit({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      documentNumber: user.documentNumber || '',
      roles: [...(user.roles || [])],
      apartmentId: user.apartmentId != null ? String(user.apartmentId) : '',
      owner: Boolean(user.owner),
      occupiesApartment: user.occupiesApartment !== false,
    })
  }

  function updateEdit(field) {
    return (event) => {
      const { value } = event.target
      setEdit((prev) => ({ ...prev, [field]: value }))
      setEditErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
    }
  }

  function toggleEditRole(role) {
    setEdit((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role]
      const next = { ...prev, roles }
      if (!roles.includes('USER')) {
        next.apartmentId = ''
        next.owner = false
        next.occupiesApartment = true
      }
      return next
    })
    setEditErrors((prev) => ({ ...prev, roles: null }))
  }

  async function saveEdit(event) {
    event.preventDefault()
    setEditErrors({})
    setError(null)
    if (edit.roles.length === 0) {
      setEditErrors({ roles: 'Selecciona al menos un rol' })
      return
    }
    setSavingEdit(true)
    try {
      const resident = edit.roles.includes('USER')
      await usersApi.update(edit.id, {
        firstName: edit.firstName.trim(),
        lastName: edit.lastName.trim(),
        phone: edit.phone.trim(),
        documentNumber: edit.documentNumber.trim() || null,
        roles: edit.roles,
        owner: resident ? edit.owner : false,
        occupiesApartment: resident && edit.owner ? edit.occupiesApartment : true,
      })
      await usersApi.assignApartment(
        edit.id,
        resident && edit.apartmentId ? Number(edit.apartmentId) : null,
      )
      setNotice(`${edit.firstName} ${edit.lastName} actualizado`)
      setEdit(EMPTY_EDIT)
      await refreshLists()
    } catch (err) {
      setError(err.message)
      if (err.fields) setEditErrors(err.fields)
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    if (tab !== 'calls') return
    ;(async () => {
      try {
        const [staffList, apartmentList] = await Promise.all([
          callsApi.staff(),
          callsApi.apartments(),
        ])
        setStaff(staffList || [])
        setCallApartments(apartmentList || [])
      } catch (err) {
        setError(err.message || 'No se pudo cargar el directorio de llamadas')
      }
    })()
  }, [tab])

  async function handleCallApartmentChange(value) {
    setSelectedApartment(value)
    setApartmentResidents([])
    if (!value) return
    setResidentsLoading(true)
    setError(null)
    try {
      setApartmentResidents(await callsApi.apartmentResidents(value))
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los residentes de la vivienda')
    } finally {
      setResidentsLoading(false)
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
            Usuarios ({usersTotal})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pending'}
            className={`tab ${tab === 'pending' ? 'tab-active' : ''}`}
            onClick={() => setTab('pending')}
          >
            Pendientes ({pendingTotal})
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
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'calls'}
            className={`tab ${tab === 'calls' ? 'tab-active' : ''}`}
            onClick={() => setTab('calls')}
          >
            Llamar
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
              <p className="muted">
                Solo se muestran los usuarios de la pagina actual ({users.length} de {usersTotal}).
              </p>
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

      {!loading && tab === 'calls' && (
        <>
          <div className="card">
            <h2>Llamar a la porteria</h2>
            <p className="muted">
              Conserjes y administradores del edificio. La llamada suena en su citofono y el
              primero que la acepta atiende.
            </p>
            {staffMembers.length === 0 ? (
              <EmptyState
                icon={<UsersIcon />}
                title="Sin personal de porteria"
                description="Crea cuentas de conserjeria desde 'Nuevo usuario' para poder llamarles."
              />
            ) : (
              <ul className="call-directory">
                {staffMembers.map((member) => (
                  <li key={member.id} className="call-directory-item">
                    <div className="call-directory-info">
                      <strong>
                        {member.firstName} {member.lastName}
                      </strong>
                      <span className="muted">{member.email}</span>
                    </div>
                    {member.roles.map((role) => (
                      <span key={role} className="badge">
                        {ROLE_LABELS[role] || role}
                      </span>
                    ))}
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    disabled={callBusy}
                    onClick={() => {
                      try {
                        startCall(member)
                      } catch (e) {
                        setError(e?.message || 'Error al iniciar la llamada')
                      }
                    }}
                  >
                      <PhoneIcon />
                      Llamar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ marginTop: '18px' }}>
            <h2>Llamar a un residente</h2>
            <p className="muted">
              Elige la vivienda y despues el resident al que quieres llamar.
            </p>

            <label className="field">
              <span>Vivienda</span>
              <select
                className="inline-select"
                value={selectedApartment}
                onChange={(e) => handleCallApartmentChange(e.target.value)}
              >
                <option value="">Selecciona una vivienda...</option>
                {callApartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.identifier}
                    {apartment.block ? ` - ${apartment.block}` : ''} ({apartment.residentCount}{' '}
                    {apartment.residentCount === 1 ? 'residente' : 'residentes'})
                  </option>
                ))}
              </select>
            </label>

            {selectedApartment && (
              <>
                <div className="row-actions" style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    disabled={callBusy || !apartmentResidents.some((r) => r.livesHere)}
                    onClick={() => {
                      try {
                        startApartmentCall(
                          Number(selectedApartment),
                          selectedApartmentOption?.identifier,
                        )
                      } catch (e) {
                        setError(e?.message || 'Error al iniciar la llamada')
                      }
                    }}
                  >
                    <PhoneIcon />
                    Llamar a toda la vivienda
                  </button>
                </div>

                {residentsLoading && (
                  <div className="loading-block">
                    <span className="spinner" aria-hidden="true" />
                    Cargando residentes...
                  </div>
                )}

                {!residentsLoading && apartmentResidents.length === 0 && (
                  <p className="muted">Esta vivienda no tiene residentes vinculados.</p>
                )}

                {apartmentResidents.length > 0 && (
                  <ul className="call-directory" style={{ marginTop: '12px' }}>
                    {apartmentResidents.map((resident) => (
                      <li key={resident.id} className="call-directory-item">
                        <div className="call-directory-info">
                          <strong>
                            {resident.firstName} {resident.lastName}
                          </strong>
                          <span className="muted">{resident.email}</span>
                        </div>
                        <span
                          className={`badge ${resident.owner ? 'badge-ok' : 'badge-plain'}`}
                        >
                          {resident.owner ? 'propietario' : 'inquilino'}
                        </span>
                        {!resident.livesHere && (
                          <span className="badge badge-warn">no vive aqui</span>
                        )}
                        {!resident.enabled && (
                          <span className="badge badge-plain">deshabilitado</span>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary btn-small"
                          disabled={callBusy || !resident.enabled}
                          onClick={() => {
                            try {
                              startCall(resident)
                            } catch (e) {
                              setError(e?.message || 'Error al iniciar la llamada')
                            }
                          }}
                        >
                          <PhoneIcon />
                          Llamar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {call && (
            <p className="muted" style={{ marginTop: '12px' }}>
              Llamada en curso con {call.peerName}.
            </p>
          )}
        </>
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
                placeholder="Buscar en la pagina actual..."
                aria-label="Buscar usuarios"
              />
            </div>
            <span className="muted">
              {tab === 'users'
                ? `${filteredUsers.length} de ${users.length} en esta pagina · ${usersTotal} en total`
                : `${filteredPending.length} de ${pending.length} en esta pagina · ${pendingTotal} en total`}
            </span>
          </div>

          {edit.id != null && (
            <form onSubmit={saveEdit} className="card edit-panel" noValidate>
              <h2>Editar {edit.firstName} {edit.lastName}</h2>
              <p className="muted">
                Quitar el rol de residente desvincula su vivienda y borra su condicion de
                propietario.
              </p>

              <div className="field-row">
                <label className="field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={edit.firstName}
                    onChange={updateEdit('firstName')}
                    required
                  />
                  {editErrors.firstName && <em className="field-error">{editErrors.firstName}</em>}
                </label>
                <label className="field">
                  <span>Apellido</span>
                  <input
                    type="text"
                    value={edit.lastName}
                    onChange={updateEdit('lastName')}
                    required
                  />
                  {editErrors.lastName && <em className="field-error">{editErrors.lastName}</em>}
                </label>
              </div>

              <label className="field">
                <span>Email</span>
                <input type="email" value={edit.email} disabled readOnly />
                <em className="field-hint">El email es su usuario y no se puede cambiar.</em>
              </label>

              <div className="field-row">
                <label className="field">
                  <span>Telefono</span>
                  <input
                    type="tel"
                    value={edit.phone}
                    onChange={updateEdit('phone')}
                    placeholder="+34 600 111 222"
                  />
                  {editErrors.phone && <em className="field-error">{editErrors.phone}</em>}
                </label>
                <label className="field">
                  <span>
                    Documento <span className="optional">(opcional)</span>
                  </span>
                  <input
                    type="text"
                    value={edit.documentNumber}
                    onChange={updateEdit('documentNumber')}
                    placeholder="12345678A"
                  />
                  {editErrors.documentNumber && (
                    <em className="field-error">{editErrors.documentNumber}</em>
                  )}
                </label>
              </div>

              <fieldset className="compose-audience">
                <legend>Roles</legend>
                <div className="role-picker">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role} className="check-row check-compact">
                      <input
                        type="checkbox"
                        checked={edit.roles.includes(role)}
                        onChange={() => toggleEditRole(role)}
                      />
                      <span>{ROLE_LABELS[role]}</span>
                    </label>
                  ))}
                </div>
                {editErrors.roles && <em className="field-error">{editErrors.roles}</em>}
              </fieldset>

              <label className="field">
                <span>Vivienda</span>
                <select
                  className="inline-select"
                  value={edit.apartmentId}
                  disabled={!edit.roles.includes('USER')}
                  onChange={updateEdit('apartmentId')}
                >
                  <option value="">Sin vivienda</option>
                  {apartments.map((apartment) => (
                    <option key={apartment.id} value={apartment.id}>
                      {apartment.identifier}
                    </option>
                  ))}
                </select>
                {!edit.roles.includes('USER') && (
                  <em className="field-hint">Solo los residentes pueden tener vivienda.</em>
                )}
              </label>

              {edit.roles.includes('USER') && (
                <div className="field-row">
                  <label className="check-row check-compact">
                    <input
                      type="checkbox"
                      checked={edit.owner}
                      onChange={(e) =>
                        setEdit((prev) => ({
                          ...prev,
                          owner: e.target.checked,
                          occupiesApartment: e.target.checked ? prev.occupiesApartment : true,
                        }))
                      }
                    />
                    <span>Propietario</span>
                  </label>
                  <label className="check-row check-compact">
                    <input
                      type="checkbox"
                      checked={edit.occupiesApartment}
                      disabled={!edit.owner}
                      onChange={(e) =>
                        setEdit((prev) => ({ ...prev, occupiesApartment: e.target.checked }))
                      }
                    />
                    <span>Vive aqui</span>
                  </label>
                </div>
              )}

              <div className="row-actions">
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit && <span className="spinner" aria-hidden="true" />}
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEdit(EMPTY_EDIT)
                    setEditErrors({})
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {tab === 'users' &&
            (filteredUsers.length === 0 ? (
              <EmptyState
                icon={<UsersIcon />}
                title={hasSearch ? 'Sin resultados' : 'No hay usuarios registrados'}
                description={
                  hasSearch
                    ? 'Ningun usuario de esta pagina coincide con tu busqueda. Prueba con otro nombre, email o telefono.'
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
              <>
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
                            <button
                              type="button"
                              className="btn btn-small"
                              disabled={busyId === u.id}
                              onClick={() => openEdit(u)}
                            >
                              Editar
                            </button>
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
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(u)}
                              disabled={busyId === u.id || u.id === currentUser?.id}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={usersPage}
                  totalPages={usersTotalPages}
                  total={usersTotal}
                  size={PAGE_SIZE}
                  busy={listLoading}
                  onChange={(next) => {
                    setSearch('')
                    loadUsers(next)
                  }}
                />
              </>
            ))}

          {tab === 'pending' &&
            (filteredPending.length === 0 ? (
              <EmptyState
                title={hasSearch ? 'Sin resultados' : 'No hay cuentas pendientes'}
                description={
                  hasSearch
                    ? 'Ningun registro pendiente de esta pagina coincide con tu busqueda.'
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
              <>
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
                              className="btn btn-small"
                              disabled={busyId === u.id}
                              onClick={() => openEdit(u)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-primary"
                              onClick={() => handleEnable(u)}
                              disabled={busyId === u.id}
                            >
                              Habilitar
                            </button>
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(u)}
                              disabled={busyId === u.id}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={pendingPage}
                  totalPages={pendingTotalPages}
                  total={pendingTotal}
                  size={PAGE_SIZE}
                  busy={listLoading}
                  onChange={(next) => {
                    setSearch('')
                    loadPending(next)
                  }}
                />
              </>
            ))}
        </>
      )}
    </div>
  )
}
