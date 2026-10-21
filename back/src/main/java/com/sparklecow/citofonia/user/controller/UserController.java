package com.sparklecow.citofonia.user.controller;

import com.sparklecow.citofonia.common.exception.ErrorResponse;
import com.sparklecow.citofonia.user.dto.AssignApartmentRequest;
import com.sparklecow.citofonia.user.dto.CreateUserRequest;
import com.sparklecow.citofonia.user.dto.UpdateUserRequest;
import com.sparklecow.citofonia.user.dto.UserResponse;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestion de usuarios. Todos los endpoints estan reservados al rol
 * {@code ADMIN} (reforzado via {@code @PreAuthorize} y reglas del filtro HTTP).
 */
@Tag(name = "Usuarios", description = "Gestion de usuarios: creacion, edicion, habilitacion y borrado logico. "
        + "Todos los endpoints requieren rol ADMIN.")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Listar usuarios activos", description = "Devuelve una paginacion de los usuarios no eliminados.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping
    public PagedModel<UserResponse> list(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable) {
        Page<UserResponse> page = userService.list(pageable);
        return new PagedModel<>(page);
    }

    @Operation(
            summary = "Listar cuentas pendientes de habilitacion",
            description = "Devuelve las cuentas creadas mediante autoregistro que aun estan deshabilitadas "
                    + "y esperan ser activadas por un administrador.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado paginado de pendientes"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/pending")
    public PagedModel<UserResponse> listPending(
            @Parameter(description = "Paginacion (page, size, sort)")
            @PageableDefault(size = 20) Pageable pageable) {
        Page<UserResponse> page = userService.listPending(pageable);
        return new PagedModel<>(page);
    }

    @Operation(summary = "Detalle de un usuario", description = "Devuelve un usuario activo por su id.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario encontrado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @GetMapping("/{id}")
    public UserResponse getById(@Parameter(description = "Id del usuario") @PathVariable Long id) {
        return userService.getById(id);
    }

    @Operation(
            summary = "Crear usuario de consergeria",
            description = "Crea un usuario directamente con rol CONCIERGE. La cuenta nace "
                    + "habilitada, ya que la verificacion la realiza el propio administrador. "
                    + "Para el autoregistro de residentes use `/api/auth/register`.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario creado"),
            @ApiResponse(responseCode = "409", description = "El email o documento ya esta registrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest request,
                               @AuthenticationPrincipal User currentUser) {
        return userService.create(request, currentUser);
    }

    @Operation(summary = "Actualizar usuario",
            description = "Actualiza nombre, apellido, telefono, documento y/o roles de un usuario.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario actualizado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "El documento ya esta registrado en otra cuenta",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Errores de validacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PutMapping("/{id}")
    public UserResponse update(@Parameter(description = "Id del usuario") @PathVariable Long id,
                               @Valid @RequestBody UpdateUserRequest request,
                               @AuthenticationPrincipal User currentUser) {
        return userService.update(id, request, currentUser);
    }

    @Operation(
            summary = "Asignar o desvincular apartamento",
            description = "Vincula un usuario a un apartamento existente. Enviando `apartmentId` nulo, "
                    + "se desvincula al usuario de toda unidad.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario actualizado"),
            @ApiResponse(responseCode = "404", description = "Usuario o apartamento no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PatchMapping("/{id}/apartment")
    public UserResponse assignApartment(
            @Parameter(description = "Id del usuario") @PathVariable Long id,
            @RequestBody AssignApartmentRequest request,
            @AuthenticationPrincipal User currentUser) {
        return userService.assignApartment(id, request.apartmentId(), currentUser);
    }

    @Operation(
            summary = "Habilitar usuario",
            description = "Habilita una cuenta creada mediante autoregistro para que su titular pueda iniciar sesion.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario habilitado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PatchMapping("/{id}/enable")
    public UserResponse enable(@Parameter(description = "Id del usuario") @PathVariable Long id,
                               @AuthenticationPrincipal User currentUser) {
        return userService.enable(id, currentUser);
    }

    @Operation(summary = "Deshabilitar usuario", description = "Impide que un usuario inicie sesion sin eliminarlo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario deshabilitado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @PatchMapping("/{id}/disable")
    public UserResponse disable(@Parameter(description = "Id del usuario") @PathVariable Long id,
                                @AuthenticationPrincipal User currentUser) {
        return userService.disable(id, currentUser);
    }

    @Operation(
            summary = "Eliminar usuario (borrado logico)",
            description = "Marca el usuario como eliminado y lo deshabilita. Los datos se conservan en base de datos. "
                    + "Un administrador no puede eliminarse a si mismo.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Usuario eliminado logicamente"),
            @ApiResponse(responseCode = "400", description = "Intento de autoreliminacion",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))})
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@Parameter(description = "Id del usuario") @PathVariable Long id,
                       @AuthenticationPrincipal User currentUser) {
        userService.delete(id, currentUser);
    }
}
