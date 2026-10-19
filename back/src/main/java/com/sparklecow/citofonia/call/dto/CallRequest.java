package com.sparklecow.citofonia.call.dto;

/**
 * Peticion recibida en {@code /app/call.portal}, {@code /app/call.accept},
 * {@code /app/call.reject} y {@code /app/call.end}: identifica la llamada
 * sobre la que se actua.
 */
public record CallRequest(String callId) {
}
