package com.sparklecow.citofonia.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Respuesta exitosa de autenticacion: token JWT y datos basicos del usuario.
 */
@Schema(description = "Token JWT emitido tras autenticarse")
public record JwtResponse(

        @Schema(description = "Token JWT firmado (uso: Authorization: Bearer <token>)")
        String token,

        @Schema(description = "Tipo de esquema de autenticacion", example = "Bearer")
        String type,

        @Schema(description = "Email del usuario autenticado", example = "admin@citofonia.local")
        String email,

        @Schema(description = "Roles del usuario", example = "[\"ADMIN\"]")
        List<String> roles) {

    public static JwtResponse bearer(String token, String email, List<String> roles) {
        return new JwtResponse(token, "Bearer", email, roles);
    }
}
