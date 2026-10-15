package com.sparklecow.citofonia.user.dto;

import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
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

        @Schema(description = "Nuevo conjunto de roles (reemplaza los actuales)", example = "[\"USER\", \"SECURITY\"]")
        Set<RoleName> roles) {
}
