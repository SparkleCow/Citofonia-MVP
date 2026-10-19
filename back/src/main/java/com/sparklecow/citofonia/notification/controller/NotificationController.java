package com.sparklecow.citofonia.notification.controller;

import com.sparklecow.citofonia.notification.NotificationEligibilityService;
import com.sparklecow.citofonia.notification.NotificationType;
import com.sparklecow.citofonia.notification.dto.NotificationPreferencesResponse;
import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consulta de las notificaciones que recibira el usuario autenticado.
 *
 * <p>Regla: notificaciones generales para toda cuenta; visitas y domicilios
 * solo para quien reside en una vivienda vinculada.</p>
 */
@Tag(name = "Notificaciones",
        description = "Preferencias efectivas de notificacion segun el perfil de vivienda del usuario")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationEligibilityService eligibilityService;

    @Operation(summary = "Preferencias de notificacion del usuario autenticado",
            description = "Devuelve los tipos de notificacion que el usuario recibira: "
                    + "general siempre; visitas y domicilios solo si reside en su apartamento "
                    + "(un propietario ausente recibe unicamente generales).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Preferencias del usuario"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @GetMapping("/preferences")
    public NotificationPreferencesResponse preferences(@AuthenticationPrincipal User currentUser) {
        boolean visits = eligibilityService.canReceive(currentUser, NotificationType.VISIT);
        boolean deliveries = eligibilityService.canReceive(currentUser, NotificationType.DELIVERY);
        return NotificationPreferencesResponse.of(
                true,
                visits,
                deliveries,
                eligibilityService.allowedTypes(currentUser),
                eligibilityService.profileOf(currentUser),
                currentUser.getApartment() != null ? currentUser.getApartment().getIdentifier() : null);
    }
}
