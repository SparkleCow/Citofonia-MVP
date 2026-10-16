import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { hasRole, useSession } from './session.jsx'
import Home from './Home.jsx'
import Login from './Login.jsx'
import ClientRegister from './ClientRegister.jsx'
import SecurityRegister from './SecurityRegister.jsx'
import Admin from './Admin.jsx'

function NavBar() {
  const { session, logout } = useSession()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-dot" /> Citofonia
      </Link>
      <nav className="nav-links">
        <NavLink to="/registro/cliente">Registro cliente</NavLink>
        <NavLink to="/registro/vigilante">Registro vigilante</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        {session ? (
          <span className="nav-user">
            <span className="badge">{session.roles?.join(' · ') || 'SIN ROL'}</span>
            <span className="muted small">{session.email}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>Salir</button>
          </span>
        ) : (
          <NavLink to="/login">Iniciar sesion</NavLink>
        )}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro/cliente" element={<ClientRegister />} />
          <Route path="/registro/vigilante" element={<SecurityRegister />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="muted small">
          Citofonia · API en <code>/api</code> (proxy a http://localhost:8081)
        </span>
      </footer>
    </div>
  )
}
