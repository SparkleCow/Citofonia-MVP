package com.sparklecow.citofonia.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Autoregistro de usuario con codigo de invitacion.
 *
 * <p>La cuenta se crea <strong>deshabilitada</strong>: un administrador debe
 * habilitarla antes de poder iniciar sesion.</p>
 */
@Schema(description = "Solicitud de autoregistro. Requiere un codigo de invitacion generado por un administrador")
public record RegisterRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        @Schema(description = "Nombre del usuario", example = "Ana")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 120, message = "El apellido no puede superar 120 caracteres")
        @Schema(description = "Apellido del usuario", example = "Garcia")
        String lastName,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email debe tener un formato valido")
        @Size(max = 160, message = "El email no puede superar 160 caracteres")
        @Schema(description = "Email unico usado como usuario", example = "ana.garcia@ejemplo.com")
        String email,

        @NotBlank(message = "La contrasena es obligatoria")
        @Size(min = 8, max = 72, message = "La contrasena debe tener entre 8 y 72 caracteres")
        @Schema(description = "Contrasena en texto plano (se almacena con BCrypt)", example = "S3gura!123")
        String password,

        @NotBlank(message = "El codigo de registro es obligatorio")
        @Size(max = 32, message = "El codigo no puede superar 32 caracteres")
        @Schema(description = "Codigo de invitacion proporcionado por un administrador", example = "K7M2P9QX4T")
        String registrationCode) {
}
