package com.sparklecow.citofonia.visit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Aviso de una visita a uno o varios residentes de la vivienda.
 */
@Schema(description = "Residentes a los que se avisa de la visita")
public record VisitNotifyRequest(

        @NotEmpty(message = "Selecciona al menos un residente")
        @Schema(description = "Ids de los residentes que residen en la vivienda visitada",
                example = "[5, 7]")
        List<Long> residentIds) {
}
