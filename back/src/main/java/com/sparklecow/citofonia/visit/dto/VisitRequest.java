package com.sparklecow.citofonia.visit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * Anotacion de una visita por parte de consergeria.
 */
@Schema(description = "Datos de la visita que anota la consergeria")
public record VisitRequest(

        @NotNull(message = "El apartamento es obligatorio")
        @Schema(description = "Apartamento al que se dirige la visita", example = "3")
        Long apartmentId,

        @NotBlank(message = "El nombre del visitante es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        @Schema(description = "Nombre de la persona que visita", example = "Marta Ruiz")
        String visitorName,

        @Size(max = 32, message = "El documento no puede superar 32 caracteres")
        @Schema(description = "Documento de identidad del visitante (opcional)", example = "12345678A")
        String visitorDocument,

        @Size(max = 32, message = "El telefono no puede superar 32 caracteres")
        @Schema(description = "Telefono de contacto del visitante (opcional)", example = "+34600111222")
        String visitorPhone,

        @Size(max = 120, message = "La empresa no puede superar 120 caracteres")
        @Schema(description = "Empresa o relacion con el resident (opcional)", example = "Fontaneria Ruiz")
        String visitorCompany,

        @Size(max = 500, message = "Las notas no pueden superar 500 caracteres")
        @Schema(description = "Motivo de la visita y observaciones (opcional)", example = "Revision de la caldera")
        String notes,

        @Schema(description = "Instante de entrada (opcional; por defecto, ahora)",
                example = "2026-10-21T10:15:00Z")
        Instant entryAt) {
}
