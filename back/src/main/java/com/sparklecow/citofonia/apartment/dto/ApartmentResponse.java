package com.sparklecow.citofonia.apartment.dto;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

/**
 * Vista publica de un apartamento junto con los usuarios vinculados (residentes).
 */
@Schema(description = "Apartamento con sus residentes")
public record ApartmentResponse(

        @Schema(description = "Identificador interno", example = "3")
        Long id,

        @Schema(description = "Identificador visible de la unidad", example = "A-101")
        String identifier,

        @Schema(description = "Torre, bloque o pabellon", example = "Torre A")
        String block,

        @Schema(description = "Piso o nivel", example = "1")
        Integer floor,

        @Schema(description = "Notas internas", example = "Frente al parque")
        String notes,

        @Schema(description = "Cantidad de residentes activos", example = "2")
        int residentCount,

        @Schema(description = "Usuarios vinculados al apartamento")
        List<ApartmentResidentResponse> residents,

        @Schema(description = "Fecha de creacion")
        Instant createdAt,

        @Schema(description = "Ultima modificacion (null si nunca se modifico)")
        Instant updatedAt) {

    public static ApartmentResponse from(Apartment apartment, List<ApartmentResidentResponse> residents) {
        List<ApartmentResidentResponse> safeResidents = residents == null ? List.of() : residents;
        return new ApartmentResponse(
                apartment.getId(),
                apartment.getIdentifier(),
                apartment.getBlock(),
                apartment.getFloor(),
                apartment.getNotes(),
                safeResidents.size(),
                safeResidents,
                apartment.getCreatedAt(),
                apartment.getUpdatedAt());
    }
}
