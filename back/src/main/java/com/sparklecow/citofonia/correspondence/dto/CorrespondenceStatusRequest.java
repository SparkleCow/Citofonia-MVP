package com.sparklecow.citofonia.correspondence.dto;

import com.sparklecow.citofonia.correspondence.entity.CorrespondenceDelivery;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Cambio de estado (y de lugar de entrega) de una correspondencia.
 */
@Schema(description = "Nuevo estado de la correspondencia")
public record CorrespondenceStatusRequest(

        @NotNull(message = "El estado es obligatorio")
        @Schema(description = "Estado de la correspondencia", example = "DELIVERED")
        CorrespondenceStatus status,

        @Schema(description = "Lugar de entrega (opcional)", example = "PORTERIA")
        CorrespondenceDelivery delivery) {
}
