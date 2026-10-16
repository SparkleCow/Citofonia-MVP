package com.sparklecow.citofonia.user.controller;

import com.sparklecow.citofonia.user.dto.JwtResponse;
import com.sparklecow.citofonia.user.dto.LoginRequest;
import com.sparklecow.citofonia.user.dto.RegisterRequest;
import com.sparklecow.citofonia.user.dto.UserResponse;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.sparklecow.citofonia.common.exception.ErrorResponse;

/**
 * Endpoints publicos de autenticacion y perfil del usuario autenticado.
 */
@Tag(name = "Autenticacion", description = "Inicio de sesion, autoregistro y perfil del usuario")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(
            summary = "Iniciar sesion",
            description = "Autentica al usuario con email y contrasena y devuelve un token JWT. "
                    + "Las cuentas deshabilitadas o borradas recibiran un error 403.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token emitido correctamente",
                    content = @Content(schema = @Schema(implementation = JwtResponse.class))),
            @ApiResponse(responseCode = "401", description = "Credenciales invalidas",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403",
                    description = "Cuenta deshabilitada (pendiente de habilitacion por administrador)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "400", description = "Peticion invalida",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public JwtResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @Operation(
            summary = "Autoregistro de cliente con codigo de invitacion",
            description = "Crea una cuenta de **cliente** (rol USER) usando un codigo de rol USER "
                    + "generado por un administrador. La cuenta se crea deshabilitada: un administrador "
                    + "debe habilitarla en `/api/users/{id}/enable` antes de poder iniciar sesion.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario registrado (pendiente de habilitacion)",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Codigo de registro invalido, expirado, usado o de otro tipo",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "El email ya esta registrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @Operation(
            summary = "Autoregistro de vigilante/seguridad con codigo de invitacion",
            description = "Crea una cuenta de **vigilante** (rol SECURITY) usando un codigo de rol SECURITY "
                    + "generado por un administrador. La cuenta se crea deshabilitada: un administrador "
                    + "debe habilitarla en `/api/users/{id}/enable` antes de poder iniciar sesion.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Vigilante registrado (pendiente de habilitacion)",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Codigo de registro invalido, expirado, usado o de otro tipo",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "El email ya esta registrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping("/register/security")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse registerSecurity(@Valid @RequestBody RegisterRequest request) {
        return authService.registerSecurity(request);
    }

    @Operation(
            summary = "Perfil del usuario autenticado",
            description = "Devuelve los datos del usuario asociado al token enviado.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil del usuario",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    public UserResponse me(@AuthenticationPrincipal User currentUser) {
        return UserResponse.from(currentUser);
    }
}
