package com.sparklecow.citofonia.emergency.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Cierre de una alerta")
public record EmergencyResolveRequest(

        @Size(max = 300, message = "Las notas no pueden superar 300 caracteres")
        @Schema(description = "Notas de resolucion (opcional)", example = "Falsa alarma, revisado el sotano")
        String notes) {
}
