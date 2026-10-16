package com.sparklecow.citofonia.apartment.controller;

import com.sparklecow.citofonia.apartment.dto.ApartmentRequest;
import com.sparklecow.citofonia.apartment.dto.ApartmentResponse;
import com.sparklecow.citofonia.apartment.dto.ApartmentResidentResponse;
import com.sparklecow.citofonia.apartment.service.ApartmentService;
import com.sparklecow.citofonia.common.exception.ErrorResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestion y consulta de apartamentos.
 *
 * <p><strong>Lectura</strong> (listar todos y ver sus residentes) reservada a los
 * roles {@code ADMIN} y {@code SECURITY}. <strong>Escritura</strong> (alta,
 * edicion y borrado) exclusiva de {@code ADMIN}.</p>
 */
@Tag(name = "Apartamentos",
        description = "Listado de apartamentos y residentes (ADMIN y SECURITY) y "
                + "gestion de unidades (solo ADMIN).")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/apartments")
@RequiredArgsConstructor
public class ApartmentController {

    private final ApartmentService apartmentService;

    @Operation(
            summary = "Listar apartamentos con sus residentes",
            description = "Devuelve una paginacion de los apartamentos activos, cada uno "
                    + "con la lista de usuarios (inquilinos) vinculados. Requiere rol ADMIN o SECURITY.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o SECURITY",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY')")
    @GetMapping
    public PagedModel<ApartmentResponse> list(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ApartmentResponse> page = apartmentService.list(pageable);
        return new PagedModel<>(page);
    }

    @Operation(summary = "Detalle de un apartamento con sus residentes",
            description = "Devuelve un apartamento por su id junto a sus usuarios vinculados. "
                    + "Requiere rol ADMIN o SECURITY.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Apartamento encontrado"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o SECURITY",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY')")
    @GetMapping("/{id}")
    public ApartmentResponse getById(
            @Parameter(description = "Id del apartamento") @PathVariable Long id) {
        return apartmentService.getById(id);
    }

    @Operation(summary = "Listar residentes de un apartamento",
            description = "Devuelve solo los usuarios vinculados al apartamento. Requiere rol ADMIN o SECURITY.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Residentes del apartamento"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o SECURITY",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY')")
    @GetMapping("/{id}/residents")
    public List<ApartmentResidentResponse> residents(
            @Parameter(description = "Id del apartamento") @PathVariable Long id) {
        return apartmentService.listResidents(id);
    }

    @Operation(summary = "Crear apartamento",
            description = "Alta de una unidad habitacional. Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Apartamento creado"),
            @ApiResponse(responseCode = "409", description = "Identificador ya existente",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApartmentResponse create(@Valid @RequestBody ApartmentRequest request) {
        return apartmentService.create(request);
    }

    @Operation(summary = "Actualizar apartamento",
            description = "Actualiza los campos de una unidad. Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Apartamento actualizado"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Identificador ya existente",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ApartmentResponse update(
            @Parameter(description = "Id del apartamento") @PathVariable Long id,
            @Valid @RequestBody ApartmentRequest request) {
        return apartmentService.update(id, request);
    }

    @Operation(summary = "Eliminar apartamento (borrado logico)",
            description = "Marca la unidad como eliminada y desvincula a sus residentes. "
                    + "Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Apartamento eliminado logicamente"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @Parameter(description = "Id del apartamento") @PathVariable Long id) {
        apartmentService.delete(id);
    }
}
