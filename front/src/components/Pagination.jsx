/**
 * Controles de paginacion para listados paginados por el servidor.
 *
 * @param {number} page pagina actual (base 0)
 * @param {number} totalPages total de paginas disponibles
 * @param {number} total total de elementos del listado
 * @param {number} size tamano de pagina
 * @param {boolean} busy deshabilita los botones mientras hay una peticion
 * @param {function} onChange callback con la nueva pagina (base 0)
 */
export default function Pagination({ page, totalPages, total, size = 20, busy = false, onChange }) {
  if (!total) return null

  const pages = Math.max(totalPages || 1, 1)
  const current = Math.min(Math.max(page || 0, 0), pages - 1)
  const first = current * size + 1
  const last = Math.min((current + 1) * size, total)

  return (
    <div className="pagination">
      <span className="muted">
        {first}-{last} de {total}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={busy || current <= 0}
          onClick={() => onChange(current - 1)}
        >
          Anterior
        </button>
        <span className="muted">
          Pagina {current + 1} de {pages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={busy || current + 1 >= pages}
          onClick={() => onChange(current + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
