package com.sparklecow.citofonia.apartment.dto;

import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Vista compacta de un usuario vinculado a un apartamento (residente).
 * No incluye el apartamento para evitar referencias circulares.
 */
@Schema(description = "Usuario vinculado a un apartamento")
public record ApartmentResidentResponse(

        @Schema(description = "Identificador interno del usuario", example = "5")
        Long id,

        @Schema(description = "Nombre", example = "Ana")
        String firstName,

        @Schema(description = "Apellido", example = "Garcia")
        String lastName,

        @Schema(description = "Email unico", example = "ana.garcia@ejemplo.com")
        String email,

        @Schema(description = "Roles del usuario", example = "[\"USER\"]")
        Set<RoleName> roles,

        @Schema(description = "Indica si la cuenta esta habilitada", example = "true")
        boolean enabled) {

    public static ApartmentResidentResponse from(User user) {
        return new ApartmentResidentResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRoles().stream().map(role -> role.getName()).collect(Collectors.toSet()),
                user.isEnabled());
    }
}
