package com.sparklecow.citofonia.call.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Residente de una vivienda, listo para ser llamado por el citofono.
 *
 * <p>Es el segundo nivel del filtrado del panel de llamadas de administracion:
 * el apartamento ya esta elegido y aqui se escoge a quien llamar.</p>
 */
@Schema(description = "Residente de un apartamento al que se puede llamar")
public record CallResidentItem(

        @Schema(description = "Identificador interno", example = "5")
        Long id,

        @Schema(description = "Nombre", example = "Ana")
        String firstName,

        @Schema(description = "Apellido", example = "Garcia")
        String lastName,

        @Schema(description = "Email unico", example = "ana.garcia@ejemplo.com")
        String email,

        @Schema(description = "Identificador de la vivienda", example = "A-101")
        String apartmentIdentifier,

        @Schema(description = "true si es propietario de la vivienda", example = "true")
        boolean owner,

        @Schema(description = "true si reside actualmente en la vivienda", example = "true")
        boolean livesHere,

        @Schema(description = "true si la cuenta esta habilitada", example = "true")
        boolean enabled) {
}
