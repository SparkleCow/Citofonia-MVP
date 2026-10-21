package com.sparklecow.citofonia.visit.dto;

import com.sparklecow.citofonia.visit.entity.Visit;
import com.sparklecow.citofonia.visit.entity.VisitStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/**
 * Vista publica de una visita, con el apartamento al que se dirige.
 */
@Schema(description = "Visita registrada en el portal de un apartamento")
public record VisitResponse(

        @Schema(description = "Identificador interno de la visita", example = "12")
        Long id,

        @Schema(description = "Id del apartamento visitado", example = "3")
        Long apartmentId,

        @Schema(description = "Identificador visible del apartamento", example = "A-101")
        String apartmentIdentifier,

        @Schema(description = "Nombre del visitante", example = "Marta Ruiz")
        String visitorName,

        @Schema(description = "Documento del visitante (puede ser null)", example = "12345678A")
        String visitorDocument,

        @Schema(description = "Telefono del visitante (puede ser null)", example = "+34600111222")
        String visitorPhone,

        @Schema(description = "Empresa o relacion con el resident (puede ser null)", example = "Fontaneria Ruiz")
        String visitorCompany,

        @Schema(description = "Observaciones (puede ser null)", example = "Revision de la caldera")
        String notes,

        @Schema(description = "Instante de entrada", example = "2026-10-21T10:15:00Z")
        Instant entryAt,

        @Schema(description = "Instante de salida (null si sigue dentro)", example = "2026-10-21T10:45:00Z")
        Instant exitAt,

        @Schema(description = "Estado de la visita", example = "NOTIFIED")
        VisitStatus status,

        @Schema(description = "Instante en que se aviso al resident (null si no se ha avisado)",
                example = "2026-10-21T10:16:00Z")
        Instant notifiedAt,

        @Schema(description = "Emails de los residentes avisados", example = "[\"ana@ejemplo.com\"]")
        List<String> notifiedTo,

        @Schema(description = "Email de quien anoto la visita", example = "conserje@citofonia.local")
        String registeredByEmail,

        @Schema(description = "Instante de creacion del registro", example = "2026-10-21T10:15:00Z")
        Instant createdAt) {

    public static VisitResponse from(Visit visit) {
        return new VisitResponse(
                visit.getId(),
                visit.getApartment().getId(),
                visit.getApartment().getIdentifier(),
                visit.getVisitorName(),
                visit.getVisitorDocument(),
                visit.getVisitorPhone(),
                visit.getVisitorCompany(),
                visit.getNotes(),
                visit.getEntryAt(),
                visit.getExitAt(),
                visit.getStatus(),
                visit.getNotifiedAt(),
                splitEmails(visit.getNotifiedTo()),
                visit.getRegisteredByEmail(),
                visit.getCreatedAt());
    }

    private static List<String> splitEmails(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .toList();
    }
}
