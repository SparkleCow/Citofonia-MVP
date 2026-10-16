import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Api } from './api.js'

const EMPTY = { firstName: '', lastName: '', email: '', password: '', registrationCode: '' }

export default function SecurityRegister() {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState(null)
  const [created, setCreated] = useState(null)
  const [loading, setLoading] = useState(false)

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors(null)
    setLoading(true)
    try {
      const data = await Api.registerSecurity({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        registrationCode: form.registrationCode.trim().toUpperCase()
      })
      setCreated(data)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fieldErrors || null)
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <div className="narrow">
        <div className="card stack">
          <span className="tag tag-security">Vigilante</span>
          <h1>Vigilante registrado</h1>
          <p className="ok">
            El registro fue exitoso. La cuenta queda <strong>deshabilitada</strong> hasta que un
            administrador la active.
          </p>
          <ul className="facts">
            <li><span>Email</span><strong>{created.email}</strong></li>
            <li><span>Estado</span><strong>{created.enabled ? 'Habilitada' : 'Pendiente de habilitacion'}</strong></li>
            <li><span>Roles</span><strong>{(created.roles || []).join(', ')}</strong></li>
          </ul>
          <div className="row">
            <Link className="btn btn-primary" to="/login">Ir a iniciar sesion</Link>
            <button className="btn" onClick={() => setCreated(null)}>Registrar otro vigilante</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="narrow">
      <form className="card stack register-security" onSubmit={onSubmit}>
        <span className="tag tag-security">Vigilante / seguridad</span>
        <h1>Registro de vigilante</h1>
        <p className="muted small">
          Ingresa el <strong>codigo de vigilante</strong> (rol SECURITY) que te entrego un
          administrador. Un codigo de cliente <strong>no</strong> sirve aqui.
        </p>

        <label>
          Codigo de vigilante
          <input
            value={form.registrationCode}
            onChange={update('registrationCode')}
            placeholder="V1G2L3A4T5"
            maxLength={32}
            required
          />
          {fieldErrors?.registrationCode && <em className="error small">{fieldErrors.registrationCode}</em>}
        </label>

        <div className="row">
          <label>
            Nombre
            <input value={form.firstName} onChange={update('firstName')} required maxLength={120} />
            {fieldErrors?.firstName && <em className="error small">{fieldErrors.firstName}</em>}
          </label>
          <label>
            Apellido
            <input value={form.lastName} onChange={update('lastName')} required maxLength={120} />
            {fieldErrors?.lastName && <em className="error small">{fieldErrors.lastName}</em>}
          </label>
        </div>

        <label>
          Email corporativo
          <input type="email" value={form.email} onChange={update('email')} required maxLength={160} />
          {fieldErrors?.email && <em className="error small">{fieldErrors.email}</em>}
        </label>

        <label>
          Contrasena
          <input type="password" value={form.password} onChange={update('password')} required minLength={8} maxLength={72} />
          {fieldErrors?.password && <em className="error small">{fieldErrors.password}</em>}
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-security" type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Crear cuenta de vigilante'}
        </button>
      </form>
    </div>
  )
}
