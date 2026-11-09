package com.sparklecow.citofonia.emergency.dto;

import java.util.List;

/**
 * Evento publicado tras confirmar la transaccion. Se difunde por WebSocket en
 * {@code /topic/emergencies} y, si hay infraestructura, por push a {@code recipientEmails}.
 */
public record EmergencyEvent(Type type, EmergencyResponse emergency, List<String> recipientEmails) {

    public enum Type {
        TRIGGERED,
        RESOLVED
    }
}
