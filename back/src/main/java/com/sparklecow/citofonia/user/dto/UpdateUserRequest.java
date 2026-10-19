package com.sparklecow.citofonia.user.dto;

import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;

/**
 * Actualizacion parcial de un usuario: solo los campos enviados se modifican.
 */
@Schema(description = "Campos modificables de un usuario (solo se actualizan los enviados)")
public record UpdateUserRequest(

        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        @Schema(description = "Nuevo nombre", example = "Carlos A.")
        String firstName,

        @Size(max = 120, message = "El apellido no puede superar 120 caracteres")
        @Schema(description = "Nuevo apellido", example = "Ruiz Mendez")
        String lastName,

        @Pattern(regexp = "^$|^[+0-9 ()-]{6,32}$",
                message = "El telefono solo puede contener numeros, espacios, +, - o parentesis")
        @Schema(description = "Nuevo telefono (cadena vacia para vaciarlo)", example = "+34600111222")
        String phone,

        @Size(max = 32, message = "El documento no puede superar 32 caracteres")
        @Schema(description = "Nuevo documento de identidad (unico)", example = "12345678A")
        String documentNumber,

        @Schema(description = "Nuevo conjunto de roles (reemplaza los actuales)",
                example = "[\"USER\", \"SECURITY\"]")
        Set<RoleName> roles,

        @Schema(description = "Id de un apartamento existente a vincular. Si se omite no se modifica", example = "3")
        Long apartmentId,

        @Schema(description = "true si es propietario de la vivienda, false si es inquilino. "
                + "Si se omite no se modifica", example = "true")
        Boolean owner,

        @Schema(description = "true si reside en la vivienda. Solo aplica a propietarios: "
                + "un inquilino siempre reside en ella. Si se omite no se modifica", example = "false")
        Boolean occupiesApartment) {
}
