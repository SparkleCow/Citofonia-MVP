package com.sparklecow.citofonia.apartment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos para crear o actualizar un apartamento (uso exclusivo de ADMIN).
 */
@Schema(description = "Datos de un apartamento")
public record ApartmentRequest(

        @NotBlank(message = "El identificador del apartamento es obligatorio")
        @Size(max = 40, message = "El identificador no puede superar 40 caracteres")
        @Schema(description = "Identificador visible de la unidad", example = "A-101")
        String identifier,

        @Size(max = 60, message = "El bloque no puede superar 60 caracteres")
        @Schema(description = "Torre, bloque o pabellon", example = "Torre A")
        String block,

        @Min(value = 0, message = "El piso no puede ser negativo")
        @Max(value = 200, message = "El piso no puede superar 200")
        @Schema(description = "Piso o nivel de la unidad", example = "1")
        Integer floor,

        @Size(max = 200, message = "Las notas no pueden superar 200 caracteres")
        @Schema(description = "Notas internas de administracion", example = "Frente al parque")
        String notes) {
}
