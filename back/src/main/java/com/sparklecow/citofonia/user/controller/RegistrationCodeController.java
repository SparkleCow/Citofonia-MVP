package com.sparklecow.citofonia.user.controller;

import com.sparklecow.citofonia.common.exception.ErrorResponse;
import com.sparklecow.citofonia.user.dto.CreateRegistrationCodeRequest;
import com.sparklecow.citofonia.user.dto.RegistrationCodeResponse;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Codigos de invitacion para autoregistro. Solo administradores.
 */
@Tag(name = "Codigos de registro",
        description = "Generacion y consulta de codigos de invitacion de un solo uso. Todos los endpoints requieren rol ADMIN.")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin/registration-codes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RegistrationCodeController {

    private final UserService userService;

    @Operation(
            summary = "Generar codigo de invitacion (cliente o vigilante)",
            description = "Genera un codigo de un solo uso con 7 dias de validez para el rol objetivo indicado "
                    + "en el cuerpo (`USER` para cliente o `SECURITY` para vigilante; por defecto `USER`). "
                    + "Facilitelo al nuevo usuario para que use `/api/auth/register` (cliente) o "
                    + "`/api/auth/register/security` (vigilante); la cuenta creada quedara deshabilitada "
                    + "hasta que un administrador la habilite.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Codigo generado",
                    content = @Content(schema = @Schema(implementation = RegistrationCodeResponse.class))),
            @ApiResponse(responseCode = "400", description = "Rol objetivo no registrable (p. ej. ADMIN)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationCodeResponse generate(@AuthenticationPrincipal User admin,
                                             @RequestBody(required = false) CreateRegistrationCodeRequest request) {
        RoleName role = (request == null || request.role() == null) ? RoleName.USER : request.role();
        return userService.generateRegistrationCode(admin, role);
    }

    @Operation(
            summary = "Generar codigo de invitacion para cliente",
            description = "Atajo que genera un codigo de rol `USER`. La cuenta se registrara en "
                    + "`/api/auth/register` y quedara deshabilitada hasta su activacion.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Codigo de cliente generado",
                    content = @Content(schema = @Schema(implementation = RegistrationCodeResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping("/client")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationCodeResponse generateClient(@AuthenticationPrincipal User admin) {
        return userService.generateRegistrationCode(admin, RoleName.USER);
    }

    @Operation(
            summary = "Generar codigo de invitacion para vigilante",
            description = "Atajo que genera un codigo de rol `SECURITY`. La cuenta se registrara en "
                    + "`/api/auth/register/security` y quedara deshabilitada hasta su activacion.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Codigo de vigilante generado",
                    content = @Content(schema = @Schema(implementation = RegistrationCodeResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping("/security")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationCodeResponse generateSecurity(@AuthenticationPrincipal User admin) {
        return userService.generateRegistrationCode(admin, RoleName.SECURITY);
    }

    @Operation(summary = "Listar codigos vigentes",
            description = "Devuelve los codigos generados que aun no se han usado y no han expirado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado de codigos vigentes"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping
    public List<RegistrationCodeResponse> list() {
        return userService.listRegistrationCodes();
    }
}
