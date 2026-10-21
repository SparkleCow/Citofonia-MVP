package com.sparklecow.citofonia.correspondence.dto;

import com.sparklecow.citofonia.correspondence.entity.Correspondence;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceDelivery;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceStatus;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/**
 * Vista publica de una correspondencia, con el apartamento a la que se
 * dirige y su destinatario.
 */
@Schema(description = "Correspondencia recibida en el portal de un apartamento")
public record CorrespondenceResponse(

        @Schema(description = "Identificador interno de la correspondencia", example = "12")
        Long id,

        @Schema(description = "Id del apartamento destinatario", example = "3")
        Long apartmentId,

        @Schema(description = "Identificador visible del apartamento", example = "A-101")
        String apartmentIdentifier,

        @Schema(description = "Tipo de correspondencia", example = "PAQUETE")
        CorrespondenceType type,

        @Schema(description = "Descripcion del contenido (puede ser null)", example = "Caja pequena de ropa")
        String description,

        @Schema(description = "Transportista (puede ser null)", example = "SEUR")
        String carrier,

        @Schema(description = "Numero de seguimiento (puede ser null)", example = "1Z999AA10123456784")
        String trackingNumber,

        @Schema(description = "Id del destinatario (null si es para la vivienda en general)", example = "7")
        Long recipientId,

        @Schema(description = "Nombre del destinatario (puede ser null)", example = "Ana Garcia")
        String recipientName,

        @Schema(description = "Email del destinatario (puede ser null)", example = "ana@ejemplo.com")
        String recipientEmail,

        @Schema(description = "Lugar de entrega", example = "PORTERIA")
        CorrespondenceDelivery delivery,

        @Schema(description = "Estado de la correspondencia", example = "NOTIFIED")
        CorrespondenceStatus status,

        @Schema(description = "Instante de recepcion", example = "2026-10-21T10:15:00Z")
        Instant receivedAt,

        @Schema(description = "Instante en que se aviso al resident (null si no se ha avisado)",
                example = "2026-10-21T10:16:00Z")
        Instant notifiedAt,

        @Schema(description = "Emails de los residentes avisados", example = "[\"ana@ejemplo.com\"]")
        List<String> notifiedTo,

        @Schema(description = "Instante en que se entrego o recogio (null si sigue pendiente)",
                example = "2026-10-21T18:00:00Z")
        Instant collectedAt,

        @Schema(description = "Observaciones (puede ser null)", example = "Dejar en porteria")
        String notes,

        @Schema(description = "Email de quien anoto la correspondencia", example = "conserje@citofonia.local")
        String registeredByEmail,

        @Schema(description = "Instante de creacion del registro", example = "2026-10-21T10:15:00Z")
        Instant createdAt) {

    public static CorrespondenceResponse from(Correspondence correspondence) {
        return new CorrespondenceResponse(
                correspondence.getId(),
                correspondence.getApartment().getId(),
                correspondence.getApartment().getIdentifier(),
                correspondence.getType(),
                correspondence.getDescription(),
                correspondence.getCarrier(),
                correspondence.getTrackingNumber(),
                correspondence.getRecipient() != null ? correspondence.getRecipient().getId() : null,
                correspondence.getRecipient() != null
                        ? (correspondence.getRecipient().getFirstName() + " "
                                + correspondence.getRecipient().getLastName()).trim()
                        : null,
                correspondence.getRecipient() != null ? correspondence.getRecipient().getEmail() : null,
                correspondence.getDelivery(),
                correspondence.getStatus(),
                correspondence.getReceivedAt(),
                correspondence.getNotifiedAt(),
                splitEmails(correspondence.getNotifiedTo()),
                correspondence.getCollectedAt(),
                correspondence.getNotes(),
                correspondence.getRegisteredByEmail(),
                correspondence.getCreatedAt());
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
