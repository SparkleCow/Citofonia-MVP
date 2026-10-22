package com.sparklecow.citofonia.call.dto;

import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;

/**
 * Miembro del personal de porteria (conserjeria o administracion) al que se
 * puede llamar por el citofono.
 */
@Schema(description = "Personal de porteria al que se puede llamar")
public record CallStaffItem(

        @Schema(description = "Identificador interno", example = "2")
        Long id,

        @Schema(description = "Nombre", example = "Luis")
        String firstName,

        @Schema(description = "Apellido", example = "Conde")
        String lastName,

        @Schema(description = "Email unico", example = "luis.conde@ejemplo.com")
        String email,

        @Schema(description = "Roles del miembro del personal", example = "[\"CONCIERGE\"]")
        Set<RoleName> roles) {
}
