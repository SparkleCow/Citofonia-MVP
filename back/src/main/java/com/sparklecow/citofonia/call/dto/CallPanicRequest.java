package com.sparklecow.citofonia.call.dto;

/**
 * Peticion recibida en {@code /app/call.panic}: consergeria o administracion
 * lanza una alerta general a todos los residentes del edificio.
 *
 * @param callId identificador de la llamada generado por el cliente
 * @param code  codigo de autorizacion que confirma la alerta
 */
public record CallPanicRequest(String callId, String code) {
}
