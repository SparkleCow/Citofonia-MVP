package com.sparklecow.citofonia.visit.dto;

import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Residente que puede recibir el aviso de una visita: reseller de la vivienda
 * (inquilino o propietario que vive en sitio).
 */
@Schema(description = "Residente elegible para recibir el aviso de una visita")
public record VisitRecipientResponse(

        @Schema(description = "Identificador interno del residente", example = "5")
        Long id,

        @Schema(description = "Nombre", example = "Ana")
        String firstName,

        @Schema(description = "Apellido", example = "Garcia")
        String lastName,

        @Schema(description = "Email unico", example = "ana.garcia@ejemplo.com")
        String email,

        @Schema(description = "Vivienda", example = "A-101")
        String apartmentIdentifier,

        @Schema(description = "true si el residente es propietario de la vivienda", example = "true")
        boolean owner) {

    public static VisitRecipientResponse from(User user) {
        return new VisitRecipientResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getApartment() != null ? user.getApartment().getIdentifier() : null,
                user.isOwner());
    }
}
