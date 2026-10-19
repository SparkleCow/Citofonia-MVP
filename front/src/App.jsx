import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { MailProvider } from './context/MailContext'
import { CallProvider } from './context/CallContext'
import { useAuth } from './context/auth-context'
import { homePathForRoles } from './utils/navigation'
import AppLayout from './components/AppLayout'
import CallOverlay from './components/CallOverlay'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminPage from './pages/admin/AdminPage'
import MailboxPage from './pages/MailboxPage'
import ResidentePage from './pages/residente/ResidentePage'
import VigilanciaPage from './pages/vigilancia/VigilanciaPage'
import './App.css'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={homePathForRoles(user.roles)} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MailProvider>
          <CallProvider>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/administracion"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vigilancia"
                  element={
                    <ProtectedRoute roles={['SECURITY', 'ADMIN']}>
                      <VigilanciaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/residente"
                  element={
                    <ProtectedRoute roles={['USER', 'ADMIN']}>
                      <ResidentePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/buzon"
                  element={
                    <ProtectedRoute roles={['USER', 'SECURITY', 'ADMIN']}>
                      <MailboxPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<HomeRedirect />} />
            </Routes>
            <CallOverlay />
          </CallProvider>
        </MailProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
