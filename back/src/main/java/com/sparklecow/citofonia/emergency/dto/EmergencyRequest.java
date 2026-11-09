package com.sparklecow.citofonia.emergency.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Activacion de la alerta general")
public record EmergencyRequest(

        @NotBlank(message = "El codigo de seguridad es obligatorio")
        @Size(max = 32, message = "Codigo no valido")
        @Schema(description = "Codigo de seguridad (se valida solo en el servidor)")
        String code,

        @Size(max = 200, message = "El mensaje no puede superar 200 caracteres")
        @Schema(description = "Descripcion breve (opcional)", example = "Incendio en el sotano")
        String message) {
}
