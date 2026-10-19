import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/client'
import { AuthContext } from './auth-context'

const STORAGE_TOKEN = 'citofonia.token'
const STORAGE_USER = 'citofonia.user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_USER)
    const token = localStorage.getItem(STORAGE_TOKEN)
    return raw && token ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)

  const persist = useCallback((next) => {
    setUser(next)
    if (next) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_USER)
      localStorage.removeItem(STORAGE_TOKEN)
    }
  }, [])

  const login = useCallback(
    async (email, password) => {
      setLoading(true)
      try {
        const data = await authApi.login(email, password)
        localStorage.setItem(STORAGE_TOKEN, data.token)
        const basic = { email: data.email, roles: data.roles }
        persist(basic)
        // Enriquece el perfil con id, nombre, apartamento, etc.
        try {
          const profile = await authApi.me()
          persist(profile)
          return profile
        } catch {
          return basic
        }
      } finally {
        setLoading(false)
      }
    },
    [persist],
  )

  const logout = useCallback(() => {
    persist(null)
  }, [persist])

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.me()
      persist(profile)
      return profile
    } catch {
      persist(null)
      return null
    }
  }, [persist])

  // Si hay sesion guardada pero solo con datos basicos, recarga el perfil.
  const needsProfile = Boolean(user && user.id === undefined)
  useEffect(() => {
    if (needsProfile) {
      ;(async () => {
        await refreshProfile()
      })()
    }
  }, [needsProfile, refreshProfile])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.roles?.includes('ADMIN')),
      login,
      logout,
      refreshProfile,
    }),
    [user, loading, login, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
