import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apartmentsApi, authApi } from '../api/client'
import PasswordField from '../components/PasswordField'
import { IntercomIcon } from '../components/icons'

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentNumber: '',
  password: '',
  confirmPassword: '',
  registrationCode: '',
  apartmentId: '',
  owner: false,
  occupies: true,
}

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [apartments, setApartments] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const options = await apartmentsApi.options()
        setApartments(Array.isArray(options) ? options : [])
      } catch {
        setApartments([])
      }
    })()
  }, [])

  function update(field) {
    return (event) => {
      const { value } = event.target
      setForm((prev) => ({ ...prev, [field]: value }))
      setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
    }
  }

  function updateCheck(field) {
    return (event) => {
      const { checked } = event.target
      setForm((prev) => ({ ...prev, [field]: checked }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Las contrasenas no coinciden' })
      return
    }

    setLoading(true)
    try {
      await authApi.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        documentNumber: form.documentNumber.trim() || null,
        password: form.password,
        registrationCode: form.registrationCode.trim(),
        apartmentId: form.apartmentId ? Number(form.apartmentId) : null,
        owner: form.owner,
        occupiesApartment: form.owner ? form.occupies : true,
      })
      setDone(true)
    } catch (err) {
      setError(err.message || 'No se pudo completar el registro')
      if (err.fields) setFieldErrors(err.fields)
    } finally {
      setLoading(false)
    }
  }

  const passwordsFilled = form.password.length > 0 && form.confirmPassword.length > 0
  const passwordsMatch = passwordsFilled && form.password === form.confirmPassword

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark">
              <IntercomIcon />
            </span>
            Citofonia
          </div>

          <h1 className="auth-title">Registro recibido</h1>
          <p className="auth-subtitle">
            Hemos creado la cuenta de {form.firstName || 'residente'} con el email{' '}
            <strong>{form.email}</strong>.
          </p>

          <ul className="steps">
            <li className="step-done">
              <span className="step-num">1</span>
              <span>Cuenta creada correctamente con tus datos y telefono de contacto.</span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>
                La administracion del edificio revisara y habilitara tu cuenta. Solo entonces
                podras iniciar sesion.
              </span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>Intenta entrar cuando tengas noticia de que esta activa.</span>
            </li>
          </ul>

          <div className="alert alert-info" style={{ marginTop: '18px' }}>
            Todavia no puedes iniciar sesion: tu cuenta esta pendiente de habilitacion.
          </div>

          <p className="auth-footer">
            <Link to="/login">Volver al inicio de sesion</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <span className="brand-mark">
            <IntercomIcon />
          </span>
          Citofonia
        </div>

        <h1 className="auth-title">Registro de residente</h1>
        <p className="auth-subtitle">
          Rellena tus datos con el codigo de registro que te han facilitado. La cuenta se creara
          pendiente de aprobacion por administracion.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-section">
            <h2 className="form-section-title">Codigo del edificio</h2>
            <label className="field field-highlight">
              <span>Codigo de registro</span>
              <input
                type="text"
                value={form.registrationCode}
                onChange={update('registrationCode')}
                placeholder="P. ej. CITOFONIA-RESIDENTES"
                required
                autoFocus
              />
              {fieldErrors.registrationCode ? (
                <em className="field-error">{fieldErrors.registrationCode}</em>
              ) : (
                <em className="field-hint">
                  Es el mismo codigo para todos los residentes; te lo facilita la administracion.
                </em>
              )}
            </label>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Tus datos</h2>

            <div className="field-row">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={update('firstName')}
                  placeholder="Tu nombre"
                  required
                />
                {fieldErrors.firstName && <em className="field-error">{fieldErrors.firstName}</em>}
              </label>
              <label className="field">
                <span>Apellido</span>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={update('lastName')}
                  placeholder="Tu apellido"
                  required
                />
                {fieldErrors.lastName && <em className="field-error">{fieldErrors.lastName}</em>}
              </label>
            </div>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="ejemplo@correo.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email ? (
                <em className="field-error">{fieldErrors.email}</em>
              ) : (
                <em className="field-hint">Sera tu usuario para iniciar sesion.</em>
              )}
            </label>

            <div className="field-row">
              <label className="field">
                <span>Telefono</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="+34 600 111 222"
                  required
                />
                {fieldErrors.phone ? (
                  <em className="field-error">{fieldErrors.phone}</em>
                ) : (
                  <em className="field-hint">Numeros, espacios, +, - o parentesis.</em>
                )}
              </label>
              <label className="field">
                <span>
                  Documento <span className="optional">(opcional)</span>
                </span>
                <input
                  type="text"
                  value={form.documentNumber}
                  onChange={update('documentNumber')}
                  placeholder="12345678A"
                />
                {fieldErrors.documentNumber && (
                  <em className="field-error">{fieldErrors.documentNumber}</em>
                )}
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Tu vivienda</h2>

            <label className="field">
              <span>
                Apartamento <span className="optional">(opcional)</span>
              </span>
              <select value={form.apartmentId} onChange={update('apartmentId')}>
                <option value="">
                  {apartments.length > 0 ? 'Selecciona tu apartamento' : 'Sin apartamentos disponibles'}
                </option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.identifier}
                    {apartment.block ? ` · ${apartment.block}` : ''}
                    {apartment.floor != null ? ` · Piso ${apartment.floor}` : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.apartmentId ? (
                <em className="field-error">{fieldErrors.apartmentId}</em>
              ) : (
                <em className="field-hint">
                  La administracion validara tu vivienda al habilitar la cuenta.
                </em>
              )}
            </label>

            <label className="check-row">
              <input type="checkbox" checked={form.owner} onChange={updateCheck('owner')} />
              <span>
                Soy propietario de la vivienda
                <span className="check-sub">Si no lo marcas, se te considerara inquilino.</span>
              </span>
            </label>

            {form.owner && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.occupies}
                  onChange={updateCheck('occupies')}
                />
                <span>
                  Actualmente vivo en la vivienda
                  <span className="check-sub">
                    Si no resides aqui, solo recibiras notificaciones generales del portal.
                  </span>
                </span>
              </label>
            )}
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Seguridad</h2>

            <div className="field-row">
              <PasswordField
                label="Contrasena"
                value={form.password}
                onChange={update('password')}
                placeholder="Minimo 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
                hint={form.password && form.password.length < 8 ? 'Minimo 8 caracteres.' : null}
                error={fieldErrors.password}
              />
              <PasswordField
                label="Repite la contrasena"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Escribe la misma otra vez"
                autoComplete="new-password"
                required
                error={fieldErrors.confirmPassword}
                hint={passwordsMatch ? null : passwordsFilled ? 'Las contrasenas no coinciden.' : null}
              />
            </div>
            {passwordsMatch && <span className="field-ok">Las contrasenas coinciden.</span>}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </div>
    </div>
  )
}
