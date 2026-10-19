import { useCallback, useEffect, useState } from 'react'
import { mailApi } from '../api/client'
import { useMail } from '../context/mail-context'
import EmptyState from '../components/EmptyState'
import { InboxIcon } from '../components/icons'

export default function MailboxPage() {
  const { stats, latest, refresh } = useMail()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMessages(await mailApi.messages())
      setError(null)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el buzon')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await load()
      await refresh()
    })()
  }, [load, refresh])

  // Un mensaje nuevo llegado por WebSocket recarga la lista.
  useEffect(() => {
    if (latest) {
      ;(async () => {
        await load()
      })()
    }
  }, [latest, load])

  async function handleToggle(message) {
    const isOpen = openId === message.id
    setOpenId(isOpen ? null : message.id)
    if (!isOpen && !message.read) {
      try {
        const updated = await mailApi.markRead(message.id)
        setMessages((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        )
        await refresh()
      } catch (err) {
        setError(err.message)
      }
    }
  }

  async function handleMarkAll() {
    setBusy(true)
    try {
      await mailApi.markAllRead()
      setMessages((prev) => prev.map((item) => ({ ...item, read: true })))
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Buzon</h1>
          <p className="page-sub">
            Mensajes de administracion del edificio.{' '}
            {stats.unread > 0 ? `${stats.unread} sin leer.` : 'Todo leido.'}
          </p>
        </div>
        {stats.unread > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleMarkAll}
            disabled={busy}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            Marcar todo como leido
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-block">
          <span className="spinner" aria-hidden="true" />
          Cargando buzon...
        </div>
      )}

      {!loading &&
        (messages.length === 0 ? (
          <EmptyState
            icon={<InboxIcon />}
            title="Tu buzon esta vacio"
            description="Los comunicados de administracion (avisos, reuniones, cortes de servicios...) apareceran aqui y te avisaremos en cuanto llegue uno nuevo."
          />
        ) : (
          <ul className="mail-list">
            {messages.map((message) => {
              const open = openId === message.id
              return (
                <li key={message.id} className={`mail-item ${message.read ? '' : 'mail-unread'}`}>
                  <button
                    type="button"
                    className="mail-item-head"
                    onClick={() => handleToggle(message)}
                    aria-expanded={open}
                  >
                    <span className="mail-dot" aria-hidden="true" />
                    <span className="mail-subject">{message.subject}</span>
                    <span className="mail-meta">
                      <span className="mail-from">{message.senderEmail}</span>
                      <span className="mail-date">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </span>
                    <span className="mail-chevron" aria-hidden="true">
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open && (
                    <div className="mail-body">
                      <p>{message.body}</p>
                      <span className="muted">
                        {message.read && message.readAt
                          ? `Leido el ${new Date(message.readAt).toLocaleString()}`
                          : 'Sin leer'}
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ))}
    </div>
  )
}
