import { createContext, useCallback, useContext, useState } from 'react'

const STORAGE_KEY = 'citofonia.session'
const SessionContext = createContext(null)

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const login = useCallback((data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setSession(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

export function hasRole(session, role) {
  return Boolean(session && Array.isArray(session.roles) && session.roles.includes(role))
}
