package com.sparklecow.citofonia.mail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Confirmacion del envio de un mensaje. */
@Schema(description = "Resultado del envio de un mensaje")
public record MailSendResponse(

        @Schema(description = "Id del mensaje guardado", example = "12")
        Long messageId,

        @Schema(description = "Asunto enviado", example = "Corte de agua el martes")
        String subject,

        @Schema(description = "Numero de buzones que recibiran el mensaje", example = "42")
        int recipientCount) {
}
