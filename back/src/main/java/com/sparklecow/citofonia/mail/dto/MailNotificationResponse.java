package com.sparklecow.citofonia.mail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Notificacion empujada por WebSocket al llegar un mensaje nuevo al buzon
 * del usuario (destino {@code /user/queue/mailbox}).
 */
@Schema(description = "Aviso de mensaje nuevo en el buzon")
public record MailNotificationResponse(

        @Schema(description = "Id de la recepcion en el buzon", example = "7")
        Long id,

        @Schema(description = "Id del mensaje", example = "12")
        Long messageId,

        @Schema(description = "Asunto", example = "Corte de agua el martes")
        String subject,

        @Schema(description = "Remitente", example = "admin@citofonia.local")
        String senderEmail,

        @Schema(description = "Fecha de envio")
        Instant createdAt,

        @Schema(description = "No leidos en el buzon tras este envio", example = "4")
        long unread) {

    public static MailNotificationResponse of(
            com.sparklecow.citofonia.mail.entity.MailboxMessage item, long unread) {
        return new MailNotificationResponse(
                item.getId(),
                item.getMessage().getId(),
                item.getMessage().getSubject(),
                item.getMessage().getSenderEmail(),
                item.getCreatedAt(),
                unread);
    }
}
