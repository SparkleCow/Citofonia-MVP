package com.sparklecow.citofonia.call.dto;

/**
 * Peticion recibida en {@code /app/call.invite}: el vigilante/administrador
 * propone una llamada a un residente concreto.
 *
 * @param callId      identificador de la llamada generado por el cliente
 * @param targetEmail email del residente al que se llama
 */
public record CallInviteRequest(String callId, String targetEmail) {
}
