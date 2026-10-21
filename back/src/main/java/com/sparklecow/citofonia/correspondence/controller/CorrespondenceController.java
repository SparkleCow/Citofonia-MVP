package com.sparklecow.citofonia.correspondence.controller;

import com.sparklecow.citofonia.common.exception.ErrorResponse;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceNotifyRequest;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceRecipientResponse;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceRequest;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceResponse;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceStatusRequest;
import com.sparklecow.citofonia.correspondence.service.CorrespondenceService;
import com.sparklecow.citofonia.user.entity.User;
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
 * Correspondencia recibida en el portal (paquetes, cartas, documentos).
 *
 * <p><strong>Consergeria y administracion</strong> anotan la correspondencia,
 * la auditan por vivienda, avisan a los residentes que residen en ella, les
 * llaman por el interfono y deciden si queda en porteria. <strong>Los
 * residentes</strong> consultan la correspondencia de su propia vivienda.</p>
 */
@Tag(name = "Correspondencia",
        description = "Registro y auditoria de correspondencia por apartamento, aviso a residentes y entrega en porteria")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/correspondences")
@RequiredArgsConstructor
public class CorrespondenceController {

    private final CorrespondenceService correspondenceService;

    @Operation(
            summary = "Listar correspondencia",
            description = "Pagina de correspondencia del edificio, de la mas reciente a la mas antigua. "
                    + "Se puede filtrar por apartamento. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @GetMapping
    public PagedModel<CorrespondenceResponse> list(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable,
            @Parameter(description = "Filtro por apartamento")
            @RequestParam(required = false) Long apartmentId) {
        Page<CorrespondenceResponse> page = correspondenceService.list(pageable, apartmentId);
        return new PagedModel<>(page);
    }

    @Operation(
            summary = "Correspondencia de mi vivienda",
            description = "Historial de correspondencia registrada para la vivienda del usuario autenticado. "
                    + "Los propietarios que no residen en ella no tienen correspondencia que consultar.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @GetMapping("/mine")
    public PagedModel<CorrespondenceResponse> mine(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<CorrespondenceResponse> page = correspondenceService.mine(pageable, currentUser);
        return new PagedModel<>(page);
    }

    @Operation(
            summary = "Residentes que pueden recibir la correspondencia",
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
    public List<CorrespondenceRecipientResponse> recipients(
            @Parameter(description = "Apartamento consultado") @RequestParam Long apartmentId) {
        return correspondenceService.recipients(apartmentId);
    }

    @Operation(
            summary = "Detalle de una correspondencia",
            description = "Devuelve la correspondencia con el apartamento al que se dirige. "
                    + "Accesible para consergeria, administracion y los residentes de esa vivienda.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Correspondencia encontrada"),
            @ApiResponse(responseCode = "403", description = "La correspondencia pertenece a otra vivienda",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Correspondencia no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/{id}")
    public CorrespondenceResponse getById(
            @Parameter(description = "Id de la correspondencia") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return correspondenceService.getById(id, currentUser);
    }

    @Operation(
            summary = "Anotar una correspondencia",
            description = "Registra la correspondencia recibida en el portal de un apartamento. "
                    + "Queda linked al apartamento para su auditoria. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Correspondencia anotada"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CorrespondenceResponse register(
            @Valid @RequestBody CorrespondenceRequest request,
            @AuthenticationPrincipal User actor) {
        return correspondenceService.register(request, actor);
    }

    @Operation(
            summary = "Avisar a los residentes de la correspondencia",
            description = "Envia la informacion de la correspondencia al buzon de los residentes indicados y "
                    + "deja constancia del aviso. Solo pueden avisarse residentes que residan en la "
                    + "vivienda destinataria. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Aviso enviado"),
            @ApiResponse(responseCode = "400", description = "Algún destinatario no reside en la vivienda",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Correspondencia no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PostMapping("/{id}/notify")
    public CorrespondenceResponse notify(
            @Parameter(description = "Id de la correspondencia") @PathVariable Long id,
            @Valid @RequestBody CorrespondenceNotifyRequest request,
            @AuthenticationPrincipal User actor) {
        return correspondenceService.notify(id, request, actor);
    }

    @Operation(
            summary = "Dejar la correspondencia en porteria",
            description = "La correspondencia queda en consergeria hasta que el resident la recoja y se "
                    + "avisa por buzon a los residentes de la vivienda. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Correspondencia en porteria"),
            @ApiResponse(responseCode = "404", description = "Correspondencia no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PostMapping("/{id}/hold")
    public CorrespondenceResponse hold(
            @Parameter(description = "Id de la correspondencia") @PathVariable Long id,
            @AuthenticationPrincipal User actor) {
        return correspondenceService.holdAtDesk(id, actor);
    }

    @Operation(
            summary = "Cambiar el estado de una correspondencia",
            description = "Actualiza el estado (entregada, devuelta) y opcionalmente el lugar de "
                    + "entrega. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Correspondencia actualizada"),
            @ApiResponse(responseCode = "404", description = "Correspondencia no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PatchMapping("/{id}/status")
    public CorrespondenceResponse updateStatus(
            @Parameter(description = "Id de la correspondencia") @PathVariable Long id,
            @Valid @RequestBody CorrespondenceStatusRequest request,
            @AuthenticationPrincipal User actor) {
        return correspondenceService.updateStatus(id, request, actor);
    }
}
