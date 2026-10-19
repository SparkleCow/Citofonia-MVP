package com.sparklecow.citofonia.user.dto;

import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Set;

/**
 * Representacion publica de un usuario. Nunca expone la contrasena.
 */
@Schema(description = "Vista publica de un usuario")
public record UserResponse(

        @Schema(description = "Identificador interno", example = "1")
        Long id,

        @Schema(description = "Nombre", example = "Ana")
        String firstName,

        @Schema(description = "Apellido", example = "Garcia")
        String lastName,

        @Schema(description = "Email unico", example = "ana.garcia@ejemplo.com")
        String email,

        @Schema(description = "Telefono de contacto (null si no tiene)", example = "+34600111222")
        String phone,

        @Schema(description = "Documento de identidad (null si no tiene)", example = "12345678A")
        String documentNumber,

        @Schema(description = "Roles asignados", example = "[\"USER\"]")
        Set<RoleName> roles,

        @Schema(description = "Id del apartamento vinculado (null si no tiene)", example = "3")
        Long apartmentId,

        @Schema(description = "Identificador del apartamento vinculado (null si no tiene)", example = "A-101")
        String apartmentIdentifier,

        @Schema(description = "true si es propietario de la vivienda, false si es inquilino "
                + "(solo tiene significado con apartamento vinculado)", example = "true")
        boolean owner,

        @Schema(description = "true si reside actualmente en la vivienda", example = "true")
        boolean occupiesApartment,

        @Schema(description = "Indica si la cuenta esta habilitada para iniciar sesion", example = "false")
        boolean enabled,

        @Schema(description = "Indica si la cuenta fue borrada logicamente", example = "false")
        boolean deleted,

        @Schema(description = "Fecha de creacion")
        Instant createdAt,

        @Schema(description = "Ultima modificacion (null si nunca se modifico)")
        Instant updatedAt,

        @Schema(description = "Email del usuario que creo la cuenta (null si autoregistro)")
        String createdByEmail,

        @Schema(description = "Email del ultimo usuario que modifico la cuenta")
        String updatedByEmail,

        @Schema(description = "Ultimo inicio de sesion (null si nunca inicio)")
        Instant lastLoginAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getDocumentNumber(),
                user.getRoles().stream().map(role -> role.getName()).collect(java.util.stream.Collectors.toSet()),
                user.getApartment() != null ? user.getApartment().getId() : null,
                user.getApartment() != null ? user.getApartment().getIdentifier() : null,
                user.isOwner(),
                user.isOccupiesApartment(),
                user.isEnabled(),
                user.isDeleted(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getCreatedByEmail(),
                user.getUpdatedByEmail(),
                user.getLastLoginAt());
    }
}
