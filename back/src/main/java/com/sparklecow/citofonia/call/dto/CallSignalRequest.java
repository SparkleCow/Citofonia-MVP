package com.sparklecow.citofonia.call.dto;

/**
 * Peticion recibida en {@code /app/call.signal}: un extremo de la llamada
 * reenvia a la contraparte su oferta SDP, respuesta o candidato ICE.
 *
 * @param callId  llamada a la que pertenece la senal
 * @param kind    {@code offer}, {@code answer} o {@code ice}
 * @param payload contenido WebRTC (SDP o candidato ICE) tal cual lo envia el cliente
 */
public record CallSignalRequest(String callId, String kind, Object payload) {
}
