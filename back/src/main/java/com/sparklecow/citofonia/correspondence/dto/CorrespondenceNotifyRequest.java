package com.sparklecow.citofonia.correspondence.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Residentes a los que consergeria avisa de la correspondencia.
 */
@Schema(description = "Residentes de la vivienda a los que se avisa")
public record CorrespondenceNotifyRequest(

        @NotEmpty(message = "Selecciona al menos un residente de la vivienda")
        @Schema(description = "Ids de los residentes de la vivienda", example = "[7, 9]")
        List<Long> residentIds) {
}
