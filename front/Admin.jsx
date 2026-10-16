import { useCallback, useEffect, useState } from 'react'
import { Api } from './api.js'
import { hasRole, useSession } from './session.jsx'

const ROLE_OPTIONS = [
  { value: 'USER', label: 'Cliente (USER)' },
  { value: 'SECURITY', label: 'Vigilante (SECURITY)' },
  { value: 'ADMIN', label: 'Administrador (ADMIN)' }
]

export default function Admin() {
  const { session, login, logout } = useSession()
  if (!hasRole(session, 'ADMIN')) {
    return <AdminLogin onLogin={login} current={session} logout={logout} />
  }
  return <AdminDashboard session={session} onLogout={logout} />
}

function AdminLogin({ onLogin, current, logout }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await Api.login(form.email.trim(), form.password)
      if (!Array.isArray(data.roles) || !data.roles.includes('ADMIN')) {
        setError('La cuenta no tiene rol de administrador.')
        return
      }
      onLogin({ token: data.token, email: data.email, roles: data.roles })
    } catch (err) {
      if (err.status === 403) setError('Cuenta deshabilitada. Un admin debe activarla.')
      else if (err.status === 401) setError('Credenciales invalidas.')
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="narrow">
      <form className="card stack" onSubmit={onSubmit}>
        <span className="tag tag-admin">Administracion</span>
        <h1>Acceso de administrador</h1>
        <p className="muted small">
          Solo administradores. Las cuentas de administrador son creadas por otro
          administrador desde este panel; no existe autoregistro para ADMIN.
        </p>

        {current && (
          <p className="warn small">
            Sesion actual: {current.email} ({(current.roles || []).join(', ') || 'sin rol'}).
            {' '}<button type="button" className="link" onClick={logout}>salir</button> para entrar con otra cuenta.
          </p>
        )}

        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label>
          Contrasena
          <input type="password" value={form.password} onChange={update('password')} required />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-admin" type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Entrar al panel'}
        </button>
      </form>
    </div>
  )
}

function AdminDashboard({ session, onLogout }) {
  const [tab, setTab] = useState('codes')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const [codes, setCodes] = useState([])
  const [users, setUsers] = useState([])
  const [apartments, setApartments] = useState([])
  const [lastCode, setLastCode] = useState(null)

  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', email: '', password: '', roles: ['USER'], apartmentId: ''
  })
  const [newApartment, setNewApartment] = useState({ identifier: '', block: '', floor: '', notes: '' })

  const flash = useCallback((msg) => {
    setNotice(msg)
    setError(null)
    window.setTimeout(() => setNotice(null), 4000)
  }, [])

  const loadAll = useCallback(async () => {
    try {
      const [codesData, usersData, apartmentsData] = await Promise.all([
        Api.listCodes(),
        Api.listUsers(),
        Api.listApartments()
      ])
      setCodes(codesData || [])
      setUsers(usersData?.content || [])
      setApartments(apartmentsData?.content || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function generateCode(kind) {
    try {
      const data = kind === 'security' ? await Api.generateSecurityCode() : await Api.generateClientCode()
      setLastCode(data)
      flash(`Codigo ${data.role} generado: ${data.code}`)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function submitUser(event) {
    event.preventDefault()
    try {
      const payload = {
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        roles: newUser.roles
      }
      if (newUser.apartmentId) payload.apartmentId = Number(newUser.apartmentId)
      const created = await Api.createUser(payload)
      flash(`Usuario creado: ${created.email} (${(created.roles || []).join(', ')})`)
      setNewUser({ firstName: '', lastName: '', email: '', password: '', roles: ['USER'], apartmentId: '' })
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleRole(role) {
    setNewUser((prev) => {
      const has = prev.roles.includes(role)
      const roles = has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role]
      return { ...prev, roles }
    })
  }

  async function submitApartment(event) {
    event.preventDefault()
    try {
      const payload = {
        identifier: newApartment.identifier.trim(),
        block: newApartment.block.trim() || null,
        floor: newApartment.floor === '' ? null : Number(newApartment.floor),
        notes: newApartment.notes.trim() || null
      }
      const created = await Api.createApartment(payload)
      flash(`Apartamento creado: ${created.identifier}`)
      setNewApartment({ identifier: '', block: '', floor: '', notes: '' })
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function action(fn, successMsg) {
    try {
      await fn()
      flash(successMsg)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack">
      <section className="card row between">
        <div>
          <span className="tag tag-admin">Administracion</span>
          <h1>Panel de administracion</h1>
          <p className="muted small">Sesion: {session.email}</p>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>Cerrar sesion</button>
      </section>

      {(notice || error) && (
        <div className={`alert ${error ? 'alert-error' : 'alert-ok'}`}>
          {error || notice}
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'codes' ? 'tab active' : 'tab'} onClick={() => setTab('codes')}>Codigos</button>
        <button className={tab === 'users' ? 'tab active' : 'tab'} onClick={() => setTab('users')}>Usuarios</button>
        <button className={tab === 'apartments' ? 'tab active' : 'tab'} onClick={() => setTab('apartments')}>Apartamentos</button>
      </div>

      {tab === 'codes' && (
        <div className="stack">
          <section className="card stack">
            <h2>Generar codigo de invitacion</h2>
            <p className="muted small">Un codigo sirve para un solo registro y expira en 7 dias.</p>
            <div className="row">
              <button className="btn btn-primary" onClick={() => generateCode('client')}>Generar codigo de cliente</button>
              <button className="btn btn-security" onClick={() => generateCode('security')}>Generar codigo de vigilante</button>
            </div>
            {lastCode && (
              <div className="code-box">
                <span className="muted small">Ultimo codigo ({lastCode.role})</span>
                <div className="row between">
                  <code className="code">{lastCode.code}</code>
                  <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(lastCode.code)}>Copiar</button>
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Codigos vigentes</h2>
            <table className="table">
              <thead>
                <tr><th>Codigo</th><th>Rol</th><th>Creado por</th><th>Expira</th></tr>
              </thead>
              <tbody>
                {codes.length === 0 && <tr><td colSpan={4} className="muted">Sin codigos vigentes.</td></tr>}
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td><code className="code">{c.code}</code></td>
                    <td><RoleBadge role={c.role} /></td>
                    <td className="muted small">{c.createdByEmail}</td>
                    <td className="muted small">{formatDate(c.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'users' && (
        <div className="stack">
          <form className="card stack" onSubmit={submitUser}>
            <h2>Crear usuario</h2>
            <p className="muted small">
              La cuenta nace habilitada. Para crear otro <strong>administrador</strong> marca el rol ADMIN.
            </p>
            <div className="row">
              <label>Nombre<input value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} required /></label>
              <label>Apellido<input value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} required /></label>
            </div>
            <label>Email<input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required /></label>
            <label>Contrasena<input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={8} maxLength={72} /></label>
            <div className="field">
              <span className="field-label">Roles</span>
              <div className="row wrap">
                {ROLE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="check">
                    <input
                      type="checkbox"
                      checked={newUser.roles.includes(opt.value)}
                      onChange={() => toggleRole(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {newUser.roles.length === 0 && <em className="error small">Selecciona al menos un rol.</em>}
            </div>
            <label>
              Apartamento (opcional)
              <select value={newUser.apartmentId} onChange={(e) => setNewUser({ ...newUser, apartmentId: e.target.value })}>
                <option value="">Sin apartamento</option>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>{a.identifier}{a.block ? ` · ${a.block}` : ''}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary" type="submit" disabled={newUser.roles.length === 0}>Crear usuario</button>
          </form>

          <section className="card">
            <h2>Usuarios registrados</h2>
            <table className="table">
              <thead>
                <tr><th>Id</th><th>Nombre</th><th>Email</th><th>Roles</th><th>Apartamento</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.firstName} {u.lastName}</td>
                    <td className="small">{u.email}</td>
                    <td>{(u.roles || []).map((r) => <RoleBadge key={r} role={r} />)}</td>
                    <td>
                      <select
                        className="mini"
                        value={u.apartmentId ?? ''}
                        onChange={(e) => action(
                          () => Api.assignApartment(u.id, e.target.value ? Number(e.target.value) : null),
                          `Apartamento actualizado para ${u.email}`
                        )}
                      >
                        <option value="">Sin apartamento</option>
                        {apartments.map((a) => (
                          <option key={a.id} value={a.id}>{a.identifier}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={u.enabled ? 'pill pill-ok' : 'pill pill-off'}>
                        {u.enabled ? 'Activo' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="row">
                      {u.enabled ? (
                        <button className="btn btn-mini" onClick={() => action(() => Api.disableUser(u.id), `Usuario ${u.email} deshabilitado`)}>Deshabilitar</button>
                      ) : (
                        <button className="btn btn-mini btn-primary" onClick={() => action(() => Api.enableUser(u.id), `Usuario ${u.email} habilitado`)}>Habilitar</button>
                      )}
                      <button className="btn btn-mini btn-danger" onClick={() => action(() => Api.deleteUser(u.id), `Usuario ${u.email} eliminado`)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'apartments' && (
        <div className="stack">
          <form className="card stack" onSubmit={submitApartment}>
            <h2>Crear apartamento</h2>
            <div className="row">
              <label>Identificador<input value={newApartment.identifier} onChange={(e) => setNewApartment({ ...newApartment, identifier: e.target.value })} placeholder="A-101" required /></label>
              <label>Bloque / torre<input value={newApartment.block} onChange={(e) => setNewApartment({ ...newApartment, block: e.target.value })} placeholder="Torre A" /></label>
              <label>Piso<input type="number" min="0" value={newApartment.floor} onChange={(e) => setNewApartment({ ...newApartment, floor: e.target.value })} /></label>
            </div>
            <label>Notas<input value={newApartment.notes} onChange={(e) => setNewApartment({ ...newApartment, notes: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Crear apartamento</button>
          </form>

          <section className="card">
            <h2>Apartamentos ({apartments.length})</h2>
            <table className="table">
              <thead>
                <tr><th>Id</th><th>Identificador</th><th>Bloque</th><th>Piso</th><th>Residentes</th><th></th></tr>
              </thead>
              <tbody>
                {apartments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td><strong>{a.identifier}</strong></td>
                    <td className="muted small">{a.block || '-'}</td>
                    <td className="muted small">{a.floor ?? '-'}</td>
                    <td>
                      {a.residentCount === 0
                        ? <span className="muted small">Sin residentes</span>
                        : (
                          <ul className="residents">
                            {a.residents.map((r) => (
                              <li key={r.id}>
                                <span>{r.firstName} {r.lastName}</span>
                                <span className="muted small">{r.email}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                    </td>
                    <td>
                      <button className="btn btn-mini btn-danger" onClick={() => action(() => Api.deleteApartment(a.id), `Apartamento ${a.identifier} eliminado`)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}

function RoleBadge({ role }) {
  const cls = role === 'ADMIN' ? 'tag-admin' : role === 'SECURITY' ? 'tag-security' : 'tag-client'
  return <span className={`tag ${cls}`}>{role}</span>
}

function formatDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}
