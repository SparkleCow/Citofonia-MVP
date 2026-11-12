/**
 * Intenciones de un solo uso entre pestañas (p. ej. Inicio → "Autorizar visita").
 * Se evita pasarlas como parámetro de ruta: el parámetro sobrevive en la pestaña
 * y reabría el formulario al volver a ella.
 */
let newVisitRequested = false;

export function requestNewVisit() {
  newVisitRequested = true;
}

/** Devuelve true una sola vez por cada `requestNewVisit()`. */
export function consumeNewVisitRequest() {
  const requested = newVisitRequested;
  newVisitRequested = false;
  return requested;
}
