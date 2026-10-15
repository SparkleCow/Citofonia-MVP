package com.sparklecow.citofonia.user.dto;

import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.Set;

/**
 * Creacion directa de usuario por un administrador.
 * La cuenta resultante nace habilitada (la verificacion ya la realizo el admin).
 */
@Schema(description = "Datos para crear un usuario directamente desde el rol administrador")
public record CreateUserRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        @Schema(description = "Nombre del usuario", example = "Carlos")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 120, message = "El apellido no puede superar 120 caracteres")
        @Schema(description = "Apellido del usuario", example = "Ruiz")
        String lastName,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email debe tener un formato valido")
        @Size(max = 160, message = "El email no puede superar 160 caracteres")
        @Schema(description = "Email unico usado como usuario", example = "carlos.ruiz@ejemplo.com")
        String email,

        @NotBlank(message = "La contrasena es obligatoria")
        @Size(min = 8, max = 72, message = "La contrasena debe tener entre 8 y 72 caracteres")
        @Schema(description = "Contrasena en texto plano (se almacena con BCrypt)", example = "S3gura!123")
        String password,

        @NotEmpty(message = "Debe asignar al menos un rol")
        @Schema(description = "Roles asignados al usuario", example = "[\"USER\"]")
        Set<RoleName> roles) {
}
