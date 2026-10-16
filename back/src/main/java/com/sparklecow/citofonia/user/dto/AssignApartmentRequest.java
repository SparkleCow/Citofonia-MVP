package com.sparklecow.citofonia.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Solicitud para vincular o desvincular un usuario de un apartamento.
 * Un valor nulo desvincula al usuario de toda unidad.
 */
@Schema(description = "Solicitud para vincular un usuario a un apartamento")
public record AssignApartmentRequest(

        @Schema(description = "Id del apartamento existente. Null para desvincular al usuario",
                example = "3")
        Long apartmentId) {
}
