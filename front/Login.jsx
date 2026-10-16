import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api } from './api.js'
import { useSession } from './session.jsx'

export default function Login() {
  const { login } = useSession()
  const navigate = useNavigate()
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
      login({ token: data.token, email: data.email, roles: data.roles })
      const isAdmin = Array.isArray(data.roles) && data.roles.includes('ADMIN')
      navigate(isAdmin ? '/admin' : '/')
    } catch (err) {
      if (err.status === 403) {
        setError('La cuenta esta deshabilitada. Un administrador debe activarla.')
      } else if (err.status === 401) {
        setError('Credenciales invalidas.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="narrow">
      <form className="card stack" onSubmit={onSubmit}>
        <h1>Iniciar sesion</h1>
        <p className="muted small">Cuentas deshabilitadas no podran ingresar hasta que un admin las active.</p>

        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required autoComplete="username" />
        </label>
        <label>
          Contrasena
          <input type="password" value={form.password} onChange={update('password')} required autoComplete="current-password" />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
