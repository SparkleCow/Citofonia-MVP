package com.sparklecow.citofonia.admin.controller;

import com.sparklecow.citofonia.call.dto.CallAuditResponse;
import com.sparklecow.citofonia.call.entity.CallAudit;
import com.sparklecow.citofonia.call.repository.CallAuditRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Historial de llamadas del panel de administracion.
 */
@Tag(name = "Administracion", description = "Historial de llamadas del citofono")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin/calls")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCallController {

    private final CallAuditRepository callAuditRepository;

    @Operation(summary = "Historial de llamadas",
            description = "Pagina de llamadas registradas, de la mas reciente a la mas antigua.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Historial paginado"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN")})
    @GetMapping
    public PagedModel<CallAuditResponse> list(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 30, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CallAudit> page = callAuditRepository.findAll(pageable);
        return new PagedModel<>(page.map(CallAuditResponse::from));
    }
}
