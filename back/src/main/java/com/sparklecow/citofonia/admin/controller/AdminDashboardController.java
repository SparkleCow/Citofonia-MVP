package com.sparklecow.citofonia.admin.controller;

import com.sparklecow.citofonia.admin.dto.ActivityItem;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceStatus;
import com.sparklecow.citofonia.correspondence.repository.CorrespondenceRepository;
import com.sparklecow.citofonia.emergency.entity.EmergencyStatus;
import com.sparklecow.citofonia.emergency.repository.EmergencyRepository;
import com.sparklecow.citofonia.visit.entity.VisitStatus;
import com.sparklecow.citofonia.visit.repository.VisitRepository;
import java.util.ArrayList;
import java.util.Comparator;
import com.sparklecow.citofonia.admin.dto.AdminDashboardResponse;
import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.call.dto.CallAuditResponse;
import com.sparklecow.citofonia.call.repository.CallAuditRepository;
import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Metricas del panel de administracion.
 */
@Tag(name = "Administracion", description = "Resumen del edificio y actividad del citofono")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final CallAuditRepository callAuditRepository;
    private final VisitRepository visitRepository;
    private final CorrespondenceRepository correspondenceRepository;
    private final EmergencyRepository emergencyRepository;

    @Operation(summary = "Resumen del edificio",
            description = "Totales de usuarios, residentes, apartamentos, pendientes y llamadas del dia.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Metricas del edificio"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN")})
    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard() {
        List<User> users = userRepository.findAllByDeletedFalse();
        List<Apartment> apartments = apartmentRepository.findAllByDeletedFalse();

        long residentsTotal = users.stream()
                .filter(user -> hasRole(user, RoleName.USER) && user.getApartment() != null)
                .count();
        long residentsActive = users.stream()
                .filter(user -> hasRole(user, RoleName.USER)
                        && user.getApartment() != null
                        && user.isEnabled())
                .count();
        // Pendientes = registros sin aprobar (no confundir con cuentas deshabilitadas).
        long pendingTotal = users.stream().filter(user -> !user.isApproved()).count();
        long conciergesTotal = users.stream()
                .filter(user -> hasRole(user, RoleName.CONCIERGE) && user.isEnabled())
                .count();
        long visitsActive = visitRepository.countByStatusIn(
                List.of(VisitStatus.PENDING, VisitStatus.NOTIFIED, VisitStatus.ADMITTED));
        long packagesPending = correspondenceRepository.countByStatusIn(
                List.of(CorrespondenceStatus.PENDING, CorrespondenceStatus.NOTIFIED));
        long activeEmergencies = emergencyRepository.countByStatus(EmergencyStatus.ACTIVE);

        List<ActivityItem> activity = new ArrayList<>();
        visitRepository.findTop5ByOrderByCreatedAtDesc().forEach(visit -> activity.add(new ActivityItem(
                "VISIT", "Visita: " + visit.getVisitorName(),
                "Apto. " + visit.getApartment().getIdentifier() + " · " + visit.getStatus(), visit.getCreatedAt())));
        correspondenceRepository.findTop5ByOrderByCreatedAtDesc().forEach(item -> activity.add(new ActivityItem(
                "PACKAGE", "Paquete" + (item.getCarrier() != null ? " de " + item.getCarrier() : ""),
                "Apto. " + item.getApartment().getIdentifier() + " · " + item.getStatus(), item.getCreatedAt())));
        emergencyRepository.findTop5ByOrderByCreatedAtDesc().forEach(emergency -> activity.add(new ActivityItem(
                "EMERGENCY", "Emergencia " + (emergency.getStatus() == EmergencyStatus.ACTIVE ? "activa" : "resuelta"),
                "Activada por " + emergency.getTriggeredByName(), emergency.getCreatedAt())));
        users.stream().filter(user -> !user.isApproved()).forEach(user -> activity.add(new ActivityItem(
                "REGISTRATION", "Registro pendiente: " + (user.getFirstName() + " " + user.getLastName()).trim(),
                user.getApartment() != null ? "Apto. " + user.getApartment().getIdentifier() : "Sin apartamento",
                user.getCreatedAt())));
        List<ActivityItem> recentActivity = activity.stream()
                .filter(item -> item.at() != null)
                .sorted(Comparator.comparing(ActivityItem::at).reversed())
                .limit(10)
                .toList();
        long activeIntercoms = users.stream()
                .filter(user -> user.getApartment() != null)
                .map(user -> user.getApartment().getId())
                .distinct()
                .count();

        Instant startOfDay = LocalDate.now()
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant();
        long callsToday = callAuditRepository.countByStartedAtGreaterThanEqual(startOfDay);
        long alertsToday = callAuditRepository.countByAlertTrueAndStartedAtGreaterThanEqual(startOfDay);

        List<CallAuditResponse> recentCalls = callAuditRepository.findTop5ByOrderByStartedAtDesc()
                .stream()
                .map(CallAuditResponse::from)
                .toList();

        return new AdminDashboardResponse(
                apartments.size(),
                residentsTotal,
                residentsActive,
                users.size(),
                pendingTotal,
                activeIntercoms,
                callsToday,
                alertsToday,
                recentCalls,
                conciergesTotal,
                visitsActive,
                packagesPending,
                activeEmergencies,
                recentActivity);
    }

    private boolean hasRole(User user, RoleName roleName) {
        for (Role role : user.getRoles()) {
            if (role.getName() == roleName) {
                return true;
            }
        }
        return false;
    }
}
