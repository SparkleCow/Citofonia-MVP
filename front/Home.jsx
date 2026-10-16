import { Link } from 'react-router-dom'
import { useSession } from './session.jsx'

export default function Home() {
  const { session } = useSession()

  return (
    <div className="stack">
      <section className="hero card">
        <h1>Citofonia</h1>
        <p className="muted">
          Consumo de la API de registros. Cada tipo de cuenta tiene su propia ruta
          y su propio formulario.
        </p>
        {session && (
          <p className="ok small">
            Sesion activa como <strong>{session.email}</strong> ({session.roles?.join(', ') || 'sin rol'})
          </p>
        )}
      </section>

      <section className="grid">
        <article className="card">
          <h2>Registro de cliente</h2>
          <p className="muted small">
            Requiere un <strong>codigo de cliente</strong> entregado por un administrador.
            La cuenta queda deshabilitada hasta que un admin la active.
          </p>
          <Link className="btn btn-primary" to="/registro/cliente">Ir al registro de cliente</Link>
        </article>

        <article className="card">
          <h2>Registro de vigilante</h2>
          <p className="muted small">
            Requiere un <strong>codigo de vigilante</strong> (rol SECURITY) entregado
            por un administrador. Formulario separado del de clientes.
          </p>
          <Link className="btn btn-primary" to="/registro/vigilante">Ir al registro de vigilante</Link>
        </article>

        <article className="card">
          <h2>Panel de administracion</h2>
          <p className="muted small">
            Genera codigos, crea usuarios (incluidos otros administradores) y consulta
            apartamentos y residentes.
          </p>
          <Link className="btn btn-primary" to="/admin">Ir al panel admin</Link>
        </article>

        <article className="card">
          <h2>Iniciar sesion</h2>
          <p className="muted small">Accede con cualquier cuenta habilitada.</p>
          <Link className="btn" to="/login">Iniciar sesion</Link>
        </article>
      </section>
    </div>
  )
}
