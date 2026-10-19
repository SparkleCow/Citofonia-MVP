import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mailApi } from '../api/client'
import { connectMail, disconnectMail } from '../lib/ws'
import { useAuth } from './auth-context'
import { MailContext } from './mail-context'

const EMPTY_STATS = { total: 0, unread: 0 }

/**
 * Estado del buzón: contadores, ultimo mensaje recibido por WebSocket y
 * aviso flotante. Mantiene la suscripcion a `/user/queue/mailbox` mientras
 * haya sesión iniciada.
 */
export function MailProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [latest, setLatest] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return null
    try {
      const next = await mailApi.stats()
      setStats(next)
      return next
    } catch {
      return null
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectMail()
      ;(async () => {
        setStats(EMPTY_STATS)
        setLatest(null)
        setToast(null)
      })()
      return undefined
    }

    ;(async () => {
      await refresh()
    })()

    connectMail({
      onMail: (notification) => {
        setLatest(notification)
        setStats((prev) => ({ total: prev.total + 1, unread: notification.unread }))
        setToast(notification)
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 6000)
      },
    })

    return () => {
      disconnectMail()
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [isAuthenticated, refresh])

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const value = useMemo(
    () => ({ stats, latest, toast, refresh, dismissToast }),
    [stats, latest, toast, refresh, dismissToast],
  )

  return (
    <MailContext.Provider value={value}>
      {children}
      {toast && (
        <div
          className="mail-toast"
          role="status"
          onClick={dismissToast}
          onKeyDown={(e) => e.key === 'Enter' && dismissToast()}
          tabIndex={0}
        >
          <strong>Mensaje nuevo</strong>
          <span className="mail-toast-subject">{toast.subject}</span>
          <span className="mail-toast-from">De {toast.senderEmail}</span>
        </div>
      )}
    </MailContext.Provider>
  )
}
