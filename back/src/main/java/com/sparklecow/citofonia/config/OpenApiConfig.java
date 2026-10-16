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
                                1. Un administrador genera un codigo de invitacion en \
                                `/api/admin/registration-codes/client` (rol USER) o \
                                `/api/admin/registration-codes/security` (rol SECURITY).
                                2. El administrador facilita el codigo al nuevo usuario.
                                3. El cliente se registra en `/api/auth/register` y el vigilante en \
                                `/api/auth/register/security`, usando el codigo que corresponda. \
                                La cuenta queda **deshabilitada**.
                                4. Un administrador habilita la cuenta en \
                                `/api/users/{id}/enable` para que pueda iniciar sesion.

                                Un codigo de cliente no puede usarse en el registro de vigilante y \
                                viceversa; tampoco existe registro para el rol ADMIN.
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
