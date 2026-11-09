package com.sparklecow.citofonia.emergency.controller;

import com.sparklecow.citofonia.emergency.dto.EmergencyRequest;
import com.sparklecow.citofonia.emergency.dto.EmergencyResolveRequest;
import com.sparklecow.citofonia.emergency.dto.EmergencyResponse;
import com.sparklecow.citofonia.emergency.service.EmergencyService;
import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Emergencias", description = "Alerta general del edificio con codigo de seguridad")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/emergencies")
@RequiredArgsConstructor
public class EmergencyController {

    private final EmergencyService emergencyService;

    @Operation(summary = "Activar alerta general",
            description = "Valida el codigo en el servidor y avisa a residentes, consergeria y administracion.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmergencyResponse trigger(@Valid @RequestBody EmergencyRequest request,
                                     @AuthenticationPrincipal User currentUser) {
        return emergencyService.trigger(request, currentUser);
    }

    @Operation(summary = "Alertas activas", description = "Alertas en curso (cualquier usuario autenticado).")
    @GetMapping("/active")
    public List<EmergencyResponse> active() {
        return emergencyService.active();
    }

    @Operation(summary = "Historial de emergencias", description = "Requiere ADMIN o CONCIERGE.")
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @GetMapping
    public PagedModel<EmergencyResponse> history(@PageableDefault(size = 30) Pageable pageable) {
        return new PagedModel<>(emergencyService.history(pageable));
    }

    @Operation(summary = "Marcar como resuelta", description = "Requiere ADMIN o CONCIERGE.")
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PatchMapping("/{id}/resolve")
    public EmergencyResponse resolve(@PathVariable Long id,
                                     @Valid @RequestBody(required = false) EmergencyResolveRequest request,
                                     @AuthenticationPrincipal User currentUser) {
        return emergencyService.resolve(id, request, currentUser);
    }
}
