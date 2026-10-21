package com.sparklecow.citofonia.call.dto;

/**
 * Entrada del directorio de llamadas: un residente con vivienda vinculada al
 * que consergeria puede llamar.
 */
public record ResidentDirectoryItem(
        Long id,
        String firstName,
        String lastName,
        String email,
        String apartmentIdentifier) {
}
