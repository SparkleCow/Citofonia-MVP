package com.sparklecow.citofonia.correspondence.dto;

import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Residente que puede recibir la correspondencia: reseller de la vivienda
 * (inquilino o propietario que vive en sitio).
 */
@Schema(description = "Residente elegible para recibir la correspondencia")
public record CorrespondenceRecipientResponse(

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

    public static CorrespondenceRecipientResponse from(User user) {
        return new CorrespondenceRecipientResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getApartment() != null ? user.getApartment().getIdentifier() : null,
                user.isOwner());
    }
}
