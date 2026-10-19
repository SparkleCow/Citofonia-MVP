package com.sparklecow.citofonia.mail.dto;

import com.sparklecow.citofonia.mail.entity.MailboxMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Mensaje presente en el buzon del usuario autenticado. */
@Schema(description = "Mensaje recibido en el buzon")
public record MailboxItemResponse(

        @Schema(description = "Id de la recepcion en este buzon", example = "7")
        Long id,

        @Schema(description = "Id del mensaje original", example = "12")
        Long messageId,

        @Schema(description = "Asunto", example = "Corte de agua el martes")
        String subject,

        @Schema(description = "Cuerpo del mensaje", example = "De 9:00 a 13:00...")
        String body,

        @Schema(description = "Email del remitente", example = "admin@citofonia.local")
        String senderEmail,

        @Schema(description = "Fecha de envio")
        Instant createdAt,

        @Schema(description = "Indica si el usuario ya lo abrio", example = "false")
        boolean read,

        @Schema(description = "Fecha de lectura (null si no se ha leido)")
        Instant readAt) {

    public static MailboxItemResponse from(MailboxMessage item) {
        return new MailboxItemResponse(
                item.getId(),
                item.getMessage().getId(),
                item.getMessage().getSubject(),
                item.getMessage().getBody(),
                item.getMessage().getSenderEmail(),
                item.getCreatedAt(),
                item.isRead(),
                item.getReadAt());
    }
}
