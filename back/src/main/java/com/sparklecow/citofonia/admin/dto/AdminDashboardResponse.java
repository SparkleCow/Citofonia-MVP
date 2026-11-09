package com.sparklecow.citofonia.admin.dto;

import com.sparklecow.citofonia.call.dto.CallAuditResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Resumen del edificio para el panel de administracion.
 */
@Schema(description = "Metricas y actividad reciente del edificio")
public record AdminDashboardResponse(

        @Schema(description = "Apartamentos activos")
        long apartmentsTotal,

        @Schema(description = "Cuentas con rol residente")
        long residentsTotal,

        @Schema(description = "Residentes con la cuenta habilitada")
        long residentsActive,

        @Schema(description = "Todas las cuentas no borradas")
        long usersTotal,

        @Schema(description = "Cuentas pendientes de habilitacion")
        long pendingTotal,

        @Schema(description = "Viviendas con al menos un usuario vinculado")
        long activeIntercoms,

        @Schema(description = "Llamadas registradas hoy")
        long callsToday,

        @Schema(description = "Alertas de panico registradas hoy")
        long alertsToday,

        @Schema(description = "Ultimas llamadas registradas")
        List<CallAuditResponse> recentCalls,

        @Schema(description = "Personal de consergeria activo")
        long conciergesTotal,

        @Schema(description = "Visitas en curso (pendientes, avisadas o dentro)")
        long visitsActive,

        @Schema(description = "Paquetes sin entregar")
        long packagesPending,

        @Schema(description = "Emergencias activas")
        long activeEmergencies,

        @Schema(description = "Actividad reciente: visitas, paquetes, emergencias y registros")
        List<ActivityItem> recentActivity) {
}
