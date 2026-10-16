package com.sparklecow.citofonia.user.dto;

import com.sparklecow.citofonia.user.enums.RoleName;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Solicitud de generacion de un codigo de invitacion.
 *
 * <p>El rol objetivo es opcional: si no se indica se asume {@code USER}
 * (cliente). Solo se admiten {@code USER} y {@code SECURITY}.</p>
 */
@Schema(description = "Solicitud de generacion de codigo de invitacion (rol objetivo opcional)")
public record CreateRegistrationCodeRequest(

        @Schema(description = "Rol objetivo del codigo: USER (cliente) o SECURITY (vigilante). "
                + "Por defecto USER", example = "USER")
        RoleName role) {
}
