package com.sparklecow.citofonia.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Propiedades del boton de panico (alerta general del edificio).
 *
 * <p>El codigo es la llave que evita que una alerta general se lance por
 * error: consergeria o administracion lo teclean antes de activarla. En prod
 * se inyecta via variable de entorno {@code PANIC_ALERT_CODE}.</p>
 */
@Validated
@ConfigurationProperties(prefix = "app.panic")
public record PanicProperties(

        @NotBlank(message = "El codigo de la alerta general es obligatorio")
        @Size(min = 3, max = 32, message = "El codigo de la alerta debe tener entre 3 y 32 caracteres")
        String code) {
}
