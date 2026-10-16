package com.sparklecow.citofonia.user.dto;

import com.sparklecow.citofonia.user.entity.RegistrationCode;
import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Codigo de registro generado por un administrador.
 */
@Schema(description = "Codigo de invitacion de un solo uso")
public record RegistrationCodeResponse(

        @Schema(description = "Identificador del codigo", example = "3")
        Long id,

        @Schema(description = "Codigo a facilitar al nuevo usuario", example = "K7M2P9QX4T")
        String code,

        @Schema(description = "Rol que se asignara al usuario que consuma el codigo", example = "USER")
        RoleName role,

        @Schema(description = "Administrador que genero el codigo")
        String createdByEmail,

        @Schema(description = "Fecha de creacion")
        Instant createdAt,

        @Schema(description = "Fecha de expiracion")
        Instant expiresAt,

        @Schema(description = "Indica si el codigo ya fue consumido", example = "false")
        boolean used,

        @Schema(description = "Email del usuario que consumio el codigo (null si nadie lo uso)")
        String usedByEmail) {

    public static RegistrationCodeResponse from(RegistrationCode code) {
        return new RegistrationCodeResponse(
                code.getId(),
                code.getCode(),
                code.getTargetRole(),
                code.getCreatedBy() != null ? code.getCreatedBy().getEmail() : null,
                code.getCreatedAt(),
                code.getExpiresAt(),
                code.isUsed(),
                code.getUsedBy() != null ? code.getUsedBy().getEmail() : null);
    }
}
