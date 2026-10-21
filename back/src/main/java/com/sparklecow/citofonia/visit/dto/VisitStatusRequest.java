package com.sparklecow.citofonia.visit.dto;

import com.sparklecow.citofonia.visit.entity.VisitStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/**
 * Cambio de estado de una visita (autorizada, rechazada, cerrada...).
 */
@Schema(description = "Nuevo estado de la visita")
public record VisitStatusRequest(

        @NotNull(message = "El estado es obligatorio")
        @Schema(description = "Estado destino", example = "ADMITTED")
        VisitStatus status,

        @Schema(description = "Instante de salida (opcional; por defecto, ahora si el estado es CLOSED)",
                example = "2026-10-21T10:45:00Z")
        Instant exitAt) {
}
