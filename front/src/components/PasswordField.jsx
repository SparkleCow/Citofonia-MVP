import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

/**
 * Campo de contrasena con boton para mostrar/ocultar, pista opcional y
 * error en linea. El resto de props se pasan al <input>.
 */
export default function PasswordField({ label, hint, error, onMouseDown, ...inputProps }) {
  const [visible, setVisible] = useState(false)

  function keepFocus(event) {
    onMouseDown?.(event)
    event.preventDefault()
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-affix">
        <input type={visible ? 'text' : 'password'} onMouseDown={keepFocus} {...inputProps} />
        <button
          type="button"
          className="affix-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          title={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <em className="field-error">{error}</em>
      ) : hint ? (
        <em className="field-hint">{hint}</em>
      ) : null}
    </label>
  )
}
