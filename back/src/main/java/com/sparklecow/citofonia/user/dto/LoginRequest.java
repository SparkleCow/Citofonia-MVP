package com.sparklecow.citofonia.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciales de acceso.
 */
@Schema(description = "Credenciales de acceso")
public record LoginRequest(

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email debe tener un formato valido")
        @Schema(description = "Email del usuario", example = "admin@citofonia.local")
        String email,

        @NotBlank(message = "La contrasena es obligatoria")
        @Schema(description = "Contrasena en texto plano", example = "Admin1234!")
        String password) {
}
