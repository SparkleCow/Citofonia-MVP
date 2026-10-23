import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { homePathForRoles } from '../utils/navigation'
import PasswordField from '../components/PasswordField'
import { IntercomIcon } from '../components/icons'

function friendlyError(err) {
  if (err?.status === 401) return 'Email o contrasena incorrectos. Revisa los datos e intenta de nuevo.'
  if (err?.status === 403) return 'Tu cuenta aun no esta habilitada. Contacta con la administracion del edificio.'
  return err?.message || 'No se pudo iniciar sesion. Intentalo de nuevo en unos segundos.'
}

export default function LoginPage() {
  const { login, loading, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const alreadyIn = isAuthenticated && user
  useEffect(() => {
    if (alreadyIn) {
      navigate(homePathForRoles(user.roles), { replace: true })
    }
  }, [alreadyIn, user, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Introduce tu email y tu contrasena para continuar.')
      return
    }
    try {
      const logged = await login(email.trim(), password)
      const from = location.state?.from
      navigate(from || homePathForRoles(logged.roles), { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <IntercomIcon />
          </span>
          Citofonia
        </div>

        <h1 className="auth-title">Bienvenido</h1>
        <p className="auth-subtitle">
          Accede al portal del edificio con tu email y tu contrasena.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              autoFocus
              required
            />
          </label>

          <PasswordField
            label="Contrasena"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contrasena"
            autoComplete="current-password"
            enterKeyHint="go"
            required
          />

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-hint">
          <strong>Eres residente:</strong> solicita el codigo de registro del edificio y crea tu
          cuenta desde el enlace de abajo. La administracion la activara antes de que puedas entrar.
        </div>

        <p className="auth-footer">
          ¿Todavia no tienes cuenta? <Link to="/registro">Registrate aqui</Link>
        </p>
      </div>
    </div>
  )
}
