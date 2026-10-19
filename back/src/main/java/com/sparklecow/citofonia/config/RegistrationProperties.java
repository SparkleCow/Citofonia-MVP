package com.sparklecow.citofonia.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Propiedades del registro de residentes.
 *
 * <p>El codigo de registro es <strong>unico, global y estatico</strong>: se
 * facilita a todos los residentes y no cambia con el tiempo. En prod se
 * inyecta via variable de entorno {@code RESIDENT_REGISTRATION_CODE}.</p>
 */
@Validated
@ConfigurationProperties(prefix = "app.registration")
public record RegistrationProperties(

        @NotBlank(message = "El codigo de registro de residentes es obligatorio")
        @Size(min = 4, max = 64, message = "El codigo de registro debe tener entre 4 y 64 caracteres")
        String residentCode) {
}
