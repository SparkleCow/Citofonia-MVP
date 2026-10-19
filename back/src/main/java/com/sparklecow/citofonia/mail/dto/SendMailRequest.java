package com.sparklecow.citofonia.mail.dto;

import com.sparklecow.citofonia.mail.MailAudience;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Solicitud de envio de mensaje desde administracion al buzon de los usuarios.
 */
@Schema(description = "Mensaje a enviar desde administracion")
public record SendMailRequest(

        @NotBlank(message = "El asunto es obligatorio")
        @Size(max = 160, message = "El asunto no puede superar 160 caracteres")
        @Schema(description = "Asunto del mensaje", example = "Corte de agua el martes")
        String subject,

        @NotBlank(message = "El cuerpo es obligatorio")
        @Size(max = 4000, message = "El mensaje no puede superar 4000 caracteres")
        @Schema(description = "Contenido del mensaje",
                example = "Habrá corte de agua de 9:00 a 13:00 el martes por mantenimiento.")
        String body,

        @NotNull(message = "La audiencia es obligatoria")
        @Schema(description = "Destinatarios: todos, residentes, vigilancia o lista explicita",
                example = "ALL")
        MailAudience audience,

        @Schema(description = "Ids de destinatarios, solo con audiencia CUSTOM",
                example = "[3, 5]")
        List<Long> recipientIds) {
}
