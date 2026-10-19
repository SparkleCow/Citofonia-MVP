import { InboxIcon } from './icons'

/**
 * Mensaje centralizado para listados vacios, con titulo, descripcion
 * y una accion opcional.
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon || <InboxIcon />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
