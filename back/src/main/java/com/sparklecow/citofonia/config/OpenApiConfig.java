package com.sparklecow.citofonia.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentacion OpenAPI de la API con esquema de seguridad JWT.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI citofoniaOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Citofonia API")
                        .description("""
                                API de gestion de usuarios del sistema de citofonia.

                                **Autenticacion:** envie el token JWT en el header \
                                `Authorization: Bearer <token>`.

                                **Flujo de registro:**
                                1. Los **residentes** se registran en `/api/auth/register` con el \
                                codigo de registro del edificio (unico, global y fijo). La cuenta \
                                queda **deshabilitada** hasta que un administrador la active.
                                2. El administrador crea cuentas de **consergeria** (rol CONCIERGE) \
                                directamente desde el panel de administracion via `POST /api/users`; \
                                esas cuentas nacen habilitadas.
                                3. Un administrador habilita cuentas pendientes en \
                                `/api/users/{id}/enable` (listado en `/api/users/pending`).

                                No existe registro para el rol ADMIN.
                                """)
                        .version("0.0.1-SNAPSHOT")
                        .contact(new Contact().name("Citofonia").email("admin@citofonia.local")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT devuelto por `/api/auth/login`")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
