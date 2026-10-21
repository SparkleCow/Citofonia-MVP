package com.sparklecow.citofonia.call.dto;

/**
 * Peticion recibida en {@code /app/call.invite}: el conserje/administrador
 * propone una llamada a un residente concreto.
 *
 * @param callId           identificador de la llamada generado por el cliente
 * @param targetEmail      email del residente al que se llama
 * @param visitId          visita que motiva la llamada (opcional). Cuando viene, la
 *                         visita queda registrada como notificada por telefono.
 * @param correspondenceId correspondencia que motiva la llamada (opcional). Cuando
 *                         viene, la correspondencia queda registrada como notificada
 *                         por telefono.
 */
public record CallInviteRequest(String callId, String targetEmail, Long visitId, Long correspondenceId) {
}
