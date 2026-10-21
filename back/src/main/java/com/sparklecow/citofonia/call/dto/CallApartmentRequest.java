package com.sparklecow.citofonia.call.dto;

/**
 * Peticion recibida en {@code /app/call.apartment}: el conserje/administrador
 * llama a una vivienda entera.
 *
 * @param callId           identificador de la llamada generado por el cliente
 * @param apartmentId      vivienda a la que se llama
 * @param visitId          visita que motiva la llamada (opcional). Cuando viene, la
 *                         visita queda registrada como notificada por telefono.
 * @param correspondenceId correspondencia que motiva la llamada (opcional). Cuando
 *                         viene, la correspondencia queda registrada como notificada
 *                         por telefono.
 */
public record CallApartmentRequest(String callId, Long apartmentId, Long visitId, Long correspondenceId) {
}
