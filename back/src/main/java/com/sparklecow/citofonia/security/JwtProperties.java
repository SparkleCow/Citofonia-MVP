package com.sparklecow.citofonia.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Propiedades JWT. En dev se definen en {@code application-dev.yaml}; en prod
 * se inyectan via variables de entorno ({@code JWT_SECRET}).
 */
@Validated
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        @NotBlank(message = "El secreto JWT es obligatorio")
        @Size(min = 32, message = "El secreto JWT debe tener al menos 32 caracteres")
        String secret,

        @NotNull(message = "La expiracion del token es obligatoria")
        Duration expiration,

        @NotBlank(message = "El issuer del token es obligatorio")
        String issuer) {
}
