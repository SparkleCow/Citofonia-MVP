package com.sparklecow.citofonia.apartment.dto;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Opcion ligera de apartamento para el formulario de autoregistro.
 * No expone residentes ni notas internas: es un listado publico.
 */
@Schema(description = "Opcion de apartamento para autoregistro (solo identificadores)")
public record ApartmentOptionResponse(

        @Schema(description = "Identificador interno", example = "1")
        Long id,

        @Schema(description = "Identificador visible de la unidad", example = "A-101")
        String identifier,

        @Schema(description = "Torre, bloque o pabellon", example = "Torre A")
        String block,

        @Schema(description = "Piso o nivel", example = "1")
        Integer floor) {

    public static ApartmentOptionResponse from(Apartment apartment) {
        return new ApartmentOptionResponse(
                apartment.getId(),
                apartment.getIdentifier(),
                apartment.getBlock(),
                apartment.getFloor());
    }
}
