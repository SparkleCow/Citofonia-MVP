package com.sparklecow.citofonia.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Autoregistro de residente con el codigo de registro fijo.
 *
 * <p>El codigo es unico para todos los residentes y no cambia con el tiempo.
 * La cuenta se crea <strong>deshabilitada</strong>: un administrador debe
 * habilitarla antes de poder iniciar sesion.</p>
 */
@Schema(description = "Solicitud de autoregistro de residente. Requiere el codigo de registro del edificio")
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

        @NotBlank(message = "El telefono es obligatorio")
        @Pattern(regexp = "^[+0-9 ()-]{6,32}$",
                message = "El telefono solo puede contener numeros, espacios, +, - o parentesis")
        @Schema(description = "Telefono de contacto", example = "+34600111222")
        String phone,

        @Size(max = 32, message = "El documento no puede superar 32 caracteres")
        @Schema(description = "Documento de identidad (opcional)", example = "12345678A")
        String documentNumber,

        @NotBlank(message = "La contrasena es obligatoria")
        @Size(min = 8, max = 72, message = "La contrasena debe tener entre 8 y 72 caracteres")
        @Schema(description = "Contrasena en texto plano (se almacena con BCrypt)", example = "S3gura!123")
        String password,

        @NotBlank(message = "El codigo de registro es obligatorio")
        @Size(max = 64, message = "El codigo no puede superar 64 caracteres")
        @Schema(description = "Codigo de registro del edificio (unico y fijo para todos los residentes)",
                example = "CITOFONIA-2024")
        String registrationCode,

        @Schema(description = "Id del apartamento que el residente selecciona al registrarse "
                + "(se omitira si la administracion no ha cargado aun las unidades)", example = "1")
        Long apartmentId,

        @Schema(description = "true si el residente es propietario de la vivienda (si no, es inquilino)",
                example = "false")
        Boolean owner,

        @Schema(description = "Solo con propietario: true si reside en la vivienda. "
                + "Los inquilinos siempre residen en ella", example = "true")
        Boolean occupiesApartment) {
}
