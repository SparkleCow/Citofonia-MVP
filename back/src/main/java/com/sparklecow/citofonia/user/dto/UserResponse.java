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

        @Schema(description = "Roles asignados", example = "[\"USER\"]")
        Set<RoleName> roles,

        @Schema(description = "Indica si la cuenta esta habilitada para iniciar sesion", example = "false")
        boolean enabled,

        @Schema(description = "Indica si la cuenta fue borrada logicamente", example = "false")
        boolean deleted,

        @Schema(description = "Fecha de creacion")
        Instant createdAt,

        @Schema(description = "Ultima modificacion (null si nunca se modifico)")
        Instant updatedAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRoles().stream().map(role -> role.getName()).collect(java.util.stream.Collectors.toSet()),
                user.isEnabled(),
                user.isDeleted(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
