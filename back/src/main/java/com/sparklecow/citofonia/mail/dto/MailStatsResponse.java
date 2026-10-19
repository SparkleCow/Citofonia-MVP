package com.sparklecow.citofonia.mail.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Contadores del buzon del usuario. */
@Schema(description = "Estadisticas del buzon del usuario")
public record MailStatsResponse(

        @Schema(description = "Mensajes totales en el buzon", example = "10")
        long total,

        @Schema(description = "Mensajes sin leer", example = "3")
        long unread) {
}
