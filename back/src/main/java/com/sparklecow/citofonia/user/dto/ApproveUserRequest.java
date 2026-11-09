package com.sparklecow.citofonia.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Aprobacion de un registro pendiente. Para residentes es obligatorio que el usuario
 * termine con apartamento: el que eligio al registrarse o el que indique aqui el admin.
 */
@Schema(description = "Datos opcionales al aprobar un registro pendiente")
public record ApproveUserRequest(

        @Schema(description = "Apartamento a asignar (sustituye al elegido en el registro)", example = "3")
        Long apartmentId,

        @Schema(description = "true = propietario, false = arrendatario", example = "false")
        Boolean owner,

        @Schema(description = "Solo propietarios: true si reside en la vivienda", example = "true")
        Boolean occupiesApartment) {
}
