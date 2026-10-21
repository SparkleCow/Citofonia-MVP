package com.sparklecow.citofonia.visit.controller;

import com.sparklecow.citofonia.common.exception.ErrorResponse;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.visit.dto.VisitNotifyRequest;
import com.sparklecow.citofonia.visit.dto.VisitRecipientResponse;
import com.sparklecow.citofonia.visit.dto.VisitRequest;
import com.sparklecow.citofonia.visit.dto.VisitResponse;
import com.sparklecow.citofonia.visit.dto.VisitStatusRequest;
import com.sparklecow.citofonia.visit.service.VisitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Visitas al portal de los apartamentos.
 *
 * <p><strong>Consergeria y administracion</strong> anotan las visitas, las
 * auditan por vivienda, avisan a los residentes que residen en ella y los
 * llaman por el interfono. <strong>Los residentes</strong> consultan el
 * historial de visitas de su propia vivienda.</p>
 */
@Tag(name = "Visitas",
        description = "Registro y auditoria de visitas por apartamento, aviso a residentes y llamada de notificacion")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/visits")
@RequiredArgsConstructor
public class VisitController {

    private final VisitService visitService;

    @Operation(
            summary = "Listar visitas",
            description = "Pagina de visitas del edificio, de la mas reciente a la mas antigua. "
                    + "Se puede filtrar por apartamento. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @GetMapping
    public PagedModel<VisitResponse> list(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable,
            @Parameter(description = "Filtro por apartamento")
            @RequestParam(required = false) Long apartmentId) {
        Page<VisitResponse> page = visitService.list(pageable, apartmentId);
        return new PagedModel<>(page);
    }

    @Operation(
            summary = "Visitas de mi vivienda",
            description = "Historial de visitas registradas para la vivienda del usuario autenticado. "
                    + "Los propietarios que no residen en ella no tienen visitas que consultar.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @GetMapping("/mine")
    public PagedModel<VisitResponse> mine(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<VisitResponse> page = visitService.mine(pageable, currentUser);
        return new PagedModel<>(page);
    }

    @Operation(
            summary = "Residentes que pueden recibir el aviso de una visita",
            description = "Residentes que residen en la vivienda indicada (inquilinos y propietarios "
                    + "que viven en sitio). Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Residentes de la vivienda"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @GetMapping("/recipients")
    public List<VisitRecipientResponse> recipients(
            @Parameter(description = "Apartamento consultado") @RequestParam Long apartmentId) {
        return visitService.recipients(apartmentId);
    }

    @Operation(
            summary = "Detalle de una visita",
            description = "Devuelve la visita con el apartamento al que se dirige. "
                    + "Accesible para consergeria, administracion y los residentes de esa vivienda.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Visita encontrada"),
            @ApiResponse(responseCode = "403", description = "La visita pertenece a otra vivienda",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Visita no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/{id}")
    public VisitResponse getById(
            @Parameter(description = "Id de la visita") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return visitService.getById(id, currentUser);
    }

    @Operation(
            summary = "Anotar una visita",
            description = "Registra la visita de un tercero al portal de un apartamento. "
                    + "Queda linked al apartamento para su auditoria. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Visita anotada"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VisitResponse register(
            @Valid @RequestBody VisitRequest request,
            @AuthenticationPrincipal User actor) {
        return visitService.register(request, actor);
    }

    @Operation(
            summary = "Avisar a los residentes de la visita",
            description = "Envia la informacion de la visita al buzon de los residentes indicados y "
                    + "deja constancia del aviso. Solo pueden avisarse residentes que residan en la "
                    + "vivienda visitada. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Aviso enviado"),
            @ApiResponse(responseCode = "400", description = "Algún destinatario no reside en la vivienda",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Visita no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PostMapping("/{id}/notify")
    public VisitResponse notify(
            @Parameter(description = "Id de la visita") @PathVariable Long id,
            @Valid @RequestBody VisitNotifyRequest request,
            @AuthenticationPrincipal User actor) {
        return visitService.notify(id, request, actor);
    }

    @Operation(
            summary = "Cambiar el estado de una visita",
            description = "Actualiza el estado (autorizada, rechazada, cerrada) y opcionalmente "
                    + "la hora de salida. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Visita actualizada"),
            @ApiResponse(responseCode = "404", description = "Visita no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PatchMapping("/{id}/status")
    public VisitResponse updateStatus(
            @Parameter(description = "Id de la visita") @PathVariable Long id,
            @Valid @RequestBody VisitStatusRequest request,
            @AuthenticationPrincipal User actor) {
        return visitService.updateStatus(id, request, actor);
    }
}
