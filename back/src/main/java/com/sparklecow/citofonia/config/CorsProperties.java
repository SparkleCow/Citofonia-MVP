package com.sparklecow.citofonia.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origenes CORS permitidos para el frontend.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(
        String allowedOrigins) {

    public List<String> origins() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return List.of();
        }
        return List.of(allowedOrigins.split(","))
                .stream()
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }
}
