package com.sparklecow.citofonia.visit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

@Schema(description = "Visita que un residente anuncia de antemano para su vivienda")
public record VisitPreauthorizeRequest(

        @NotBlank(message = "El nombre del visitante es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        @Schema(description = "Nombre de la persona que visita", example = "Marta Ruiz")
        String visitorName,

        @NotBlank(message = "La cedula del visitante es obligatoria")
        @Pattern(regexp = "\\d{6,12}", message = "La cedula debe tener entre 6 y 12 digitos")
        @Schema(description = "Cedula del visitante (solo digitos)", example = "1032456789")
        String visitorDocument,

        @NotNull(message = "La fecha y hora estimadas son obligatorias")
        @Schema(description = "Llegada estimada", example = "2026-10-21T10:15:00Z")
        Instant expectedAt,

        @Size(max = 200, message = "El motivo no puede superar 200 caracteres")
        @Schema(description = "Motivo de la visita (opcional)", example = "Cena familiar")
        String reason) {
}
