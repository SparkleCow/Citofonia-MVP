package com.sparklecow.citofonia.notification.dto;

import com.sparklecow.citofonia.notification.HousingProfile;
import com.sparklecow.citofonia.notification.NotificationType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Preferencias efectivas de notificacion del usuario autenticado.
 * No son configurables: derivan de su perfil de vivienda.
 */
@Schema(description = "Notificaciones que el usuario recibira, segun su perfil de vivienda")
public record NotificationPreferencesResponse(

        @Schema(description = "Mensajes generales del portal (siempre activos)", example = "true")
        boolean general,

        @Schema(description = "Llegada de visitas al apartamento", example = "true")
        boolean visits,

        @Schema(description = "Entrega de domicilios en el apartamento", example = "true")
        boolean deliveries,

        @Schema(description = "Tipos de notificacion habilitados", example = "[\"GENERAL\", \"VISIT\", \"DELIVERY\"]")
        List<NotificationType> types,

        @Schema(description = "Perfil de vivienda", example = "RESIDENT")
        HousingProfile profile,

        @Schema(description = "Identificador del apartamento (null si no tiene)", example = "A-101")
        String apartmentIdentifier) {

    public static NotificationPreferencesResponse of(boolean general, boolean visits, boolean deliveries,
                                                     List<NotificationType> types, HousingProfile profile,
                                                     String apartmentIdentifier) {
        return new NotificationPreferencesResponse(general, visits, deliveries, types, profile, apartmentIdentifier);
    }
}
