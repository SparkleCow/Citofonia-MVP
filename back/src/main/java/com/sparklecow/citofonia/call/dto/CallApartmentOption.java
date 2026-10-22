package com.sparklecow.citofonia.call.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Apartamento activo con el numero de residentes vinculados.
 *
 * <p>Es el primer nivel del filtrado del panel de llamadas de administracion:
 * se elige el apartamento y despues se elige a que resident de ese
 * apartamento se quiere llamar.</p>
 */
@Schema(description = "Apartamento con numero de residentes vinculados")
public record CallApartmentOption(

        @Schema(description = "Identificador interno", example = "3")
        Long id,

        @Schema(description = "Identificador visible de la unidad", example = "A-101")
        String identifier,

        @Schema(description = "Torre, bloque o pabellon", example = "Torre A")
        String block,

        @Schema(description = "Piso o nivel", example = "1")
        Integer floor,

        @Schema(description = "Residentes vinculados a la unidad", example = "2")
        int residentCount) {
}
