package com.sparklecow.citofonia.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Habilita CORS para los origenes declarados en {@code app.cors.allowed-origins}
 * (con {@code *}, cualquier origen: desarrollo abierto). Las peticiones
 * preflight OPTIONS se autorizan en {@link SecurityConfig}.
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final CorsProperties corsProperties;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var origins = corsProperties.origins();
        if (origins.isEmpty()) {
            return;
        }
        registry.addMapping("/api/**")
                // allowedOriginPatterns admite "*" junto a allowCredentials.
                .allowedOriginPatterns(origins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Location")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
