package com.sparklecow.citofonia.call.dto;

import com.sparklecow.citofonia.user.entity.User;

/**
 * Mensaje que el backend empuja por la cola personal de un usuario para
 * gobernar una llamada de audio (invitacion, aceptacion, senalizacion WebRTC
 * y cierre).
 *
 * @param type          tipo de evento
 * @param callId        identificador de la llamada generado por el extremo llamante
 * @param from          email del usuario que origina el mensaje
 * @param fromName      nombre visible del usuario que origina el mensaje
 * @param fromApartment vivienda del llamante (para mostrar "A-101" en porteria)
 * @param kind          para {@code SIGNAL}: {@code offer}, {@code answer} o {@code ice}
 * @param payload       contenido de la senalizacion WebRTC (SDP o candidato ICE)
 * @param message       texto informativo de cierre o de error
 */
public record CallEnvelope(
        CallEventType type,
        String callId,
        String from,
        String fromName,
        String fromApartment,
        String kind,
        Object payload,
        String message) {

    public static CallEnvelope invite(String callId, User caller) {
        return new CallEnvelope(
                CallEventType.INVITE, callId, caller.getEmail(), displayName(caller), apartmentOf(caller), null, null, null);
    }

    public static CallEnvelope accept(String callId, User callee) {
        return new CallEnvelope(
                CallEventType.ACCEPT, callId, callee.getEmail(), displayName(callee), apartmentOf(callee), null, null, null);
    }

    public static CallEnvelope reject(String callId, User callee) {
        return new CallEnvelope(
                CallEventType.REJECT, callId, callee.getEmail(), displayName(callee), apartmentOf(callee), null, null, null);
    }

    public static CallEnvelope signal(String callId, User from, String kind, Object payload) {
        return new CallEnvelope(
                CallEventType.SIGNAL, callId, from.getEmail(), displayName(from), null, kind, payload, null);
    }

    public static CallEnvelope end(String callId, User from) {
        return new CallEnvelope(
                CallEventType.END, callId, from.getEmail(), displayName(from), null, null, null, null);
    }

    /** La contraparte se ha desconectado sin colgar: se cierra la llamada. */
    public static CallEnvelope endedByDisconnect(String callId, String peerEmail) {
        return new CallEnvelope(CallEventType.END, callId, peerEmail, null, null, null, null, null);
    }

    /** Cierre con explicacion: llamada atendida por otro, nadie contesto... */
    public static CallEnvelope endedWithMessage(String callId, String fromEmail, String message) {
        return new CallEnvelope(CallEventType.END, callId, fromEmail, null, null, null, null, message);
    }

    public static CallEnvelope error(String message) {
        return new CallEnvelope(CallEventType.ERROR, null, null, null, null, null, null, message);
    }

    private static String displayName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private static String apartmentOf(User user) {
        return user.getApartment() != null ? user.getApartment().getIdentifier() : null;
    }
}
