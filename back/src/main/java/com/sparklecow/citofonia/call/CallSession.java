package com.sparklecow.citofonia.call;

import java.time.Instant;
import java.util.Collection;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Getter;

/**
 * Llamada de audio activa o en timbre, mantenida en memoria mientras dure.
 *
 * <p>Una llamada tiene un llamante, uno o varios invitados (timbrados) y,
 * una vez alguien contesta, un atendido. El caso de varios invitados es la
 * llamada a porteria: se timbra a toda la consergeria conectada y el primero
 * que acepta atiende la llamada.</p>
 */
@Getter
public final class CallSession {

    private final String callId;
    private final String callerEmail;

    /** Usuarios a los que se esta timbrando (uno si es una llamada directa). */
    private final Set<String> invitedEmails;

    /**
     * {@code true} si la llamada se dirige a varios destinatarios a la vez
     * (porteria o vivienda): el primero que acepta atiende y al resto se le
     * cierra el aviso.
     */
    private final boolean multiTarget;

    /**
     * {@code true} si es una alerta general (boton de panico): el resident
     * recibe un aviso de emergencia y el primero que la acepta la atiende.
     */
    private final boolean alert;

    private final Instant createdAt;

    /** Usuario que ha aceptado; {@code null} mientras sigue sonando. */
    private volatile String calleeEmail;

    public CallSession(String callId, String callerEmail, Collection<String> invitedEmails, boolean multiTarget) {
        this(callId, callerEmail, invitedEmails, multiTarget, false);
    }

    public CallSession(String callId, String callerEmail, Collection<String> invitedEmails,
                       boolean multiTarget, boolean alert) {
        this.callId = callId;
        this.callerEmail = callerEmail;
        this.invitedEmails = ConcurrentHashMap.newKeySet();
        this.invitedEmails.addAll(invitedEmails);
        this.multiTarget = multiTarget;
        this.alert = alert;
        this.createdAt = Instant.now();
    }

    public boolean involves(String email) {
        return isCaller(email) || isInvited(email) || hasAnswered(email);
    }

    public boolean isCaller(String email) {
        return callerEmail.equalsIgnoreCase(email);
    }

    public boolean isInvited(String email) {
        return invitedEmails.stream().anyMatch(invited -> invited.equalsIgnoreCase(email));
    }

    public boolean isAnswered() {
        return calleeEmail != null;
    }

    public boolean hasAnswered(String email) {
        return calleeEmail != null && calleeEmail.equalsIgnoreCase(email);
    }

    /** Marca quien atiende la llamada. */
    public void answer(String email) {
        this.calleeEmail = email;
    }

    /** Todos los participantes actuales (llamante, invitados y atendido). */
    public Set<String> participants() {
        Set<String> all = ConcurrentHashMap.newKeySet();
        all.add(callerEmail);
        all.addAll(invitedEmails);
        if (calleeEmail != null) {
            all.add(calleeEmail);
        }
        return all;
    }
}
