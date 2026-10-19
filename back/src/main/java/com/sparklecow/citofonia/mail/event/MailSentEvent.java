package com.sparklecow.citofonia.mail.event;

import com.sparklecow.citofonia.mail.dto.MailNotificationResponse;
import java.util.List;

/**
 * Evento publicado tras confirmar la transaccion de envio: cada
 * destinatario recibe el aviso por su cola WebSocket.
 *
 * @param deliveries pares (email destinatario, notificacion a empujar)
 */
public record MailSentEvent(List<Delivery> deliveries) {

    public record Delivery(String email, MailNotificationResponse notification) {
    }
}
