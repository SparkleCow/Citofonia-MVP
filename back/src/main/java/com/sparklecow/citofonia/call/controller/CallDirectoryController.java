package com.sparklecow.citofonia.call.controller;

import com.sparklecow.citofonia.call.dto.CallApartmentOption;
import com.sparklecow.citofonia.call.dto.CallResidentItem;
import com.sparklecow.citofonia.call.dto.CallStaffItem;
import com.sparklecow.citofonia.call.dto.ResidentDirectoryItem;
import com.sparklecow.citofonia.call.service.CallService;
import com.sparklecow.citofonia.common.exception.ErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Directorio de llamadas.
 *
 * <p>El listado plano de residentes es para consergeria y administracion. El
 * panel de llamadas de administracion usa ademas un filtrado en dos niveles
 * (apartamento y despues residente de ese apartamento) y el directorio del
 * personal de porteria; ambos son exclusivos de {@code ADMIN}.</p>
 */
@Tag(name = "Llamadas",
        description = "Directorio de residentes, de Apartamentos y del personal de porteria para el citofono.")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallDirectoryController {

    private final CallService callService;

    @Operation(summary = "Directorio de residentes con vivienda",
            description = "Cuentas con rol residente y vivienda vinculada. Requiere rol ADMIN o CONCIERGE.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado de residentes"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN o CONCIERGE",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/residents")
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    public List<ResidentDirectoryItem> residents() {
        return callService.listResidents();
    }

    @Operation(summary = "Apartamentos con el numero de residentes",
            description = "Primer nivel del filtrado del panel de llamadas: las viviendas activas y "
                    + "cuantos residentes tienen vinculados. Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado de apartamentos"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/apartments")
    @PreAuthorize("hasRole('ADMIN')")
    public List<CallApartmentOption> apartments() {
        return callService.listCallApartments();
    }

    @Operation(summary = "Residentes de un apartamento",
            description = "Segundo nivel del filtrado: los residentes vinculados a la vivienda elegida, "
                    + "listos para llamar. Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Residentes del apartamento"),
            @ApiResponse(responseCode = "404", description = "Apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/apartments/{id}/residents")
    @PreAuthorize("hasRole('ADMIN')")
    public List<CallResidentItem> apartmentResidents(
            @Parameter(description = "Id del apartamento") @PathVariable Long id) {
        return callService.listApartmentResidents(id);
    }

    @Operation(summary = "Personal de porteria",
            description = "Conserjes y administradores habilitados a los que administracion puede "
                    + "llamar por el citofono. Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado del personal de porteria"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public List<CallStaffItem> staff() {
        return callService.listStaff();
    }
}
