import { useRef, useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

/**
 * Campo de contrasena con boton para mostrar/ocultar, pista opcional y
 * error en linea. El resto de props se pasan al <input>.
 */
export default function PasswordField({ label, hint, error, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)

  function toggleVisible(event) {
    // Evita que el boton robe el foco al input (sobre todo en movil).
    event.preventDefault()
    setVisible((value) => !value)
    inputRef.current?.focus()
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-affix">
        <input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          {...inputProps}
        />
        <button
          type="button"
          className="affix-btn"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleVisible}
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
