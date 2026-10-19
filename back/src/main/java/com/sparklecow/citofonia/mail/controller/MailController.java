package com.sparklecow.citofonia.mail.controller;

import com.sparklecow.citofonia.mail.dto.MailStatsResponse;
import com.sparklecow.citofonia.mail.dto.MailboxItemResponse;
import com.sparklecow.citofonia.mail.service.MailService;
import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Buzon del usuario autenticado: lectura y control de no leidos.
 * Cada usuario solo ve sus propios mensajes.
 */
@Tag(name = "Buzon",
        description = "Mensajes recibidos por el usuario autenticado")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;

    @Operation(summary = "Mensajes de mi buzon",
            description = "Lista los mensajes recibidos, del mas reciente al mas antiguo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Listado de mensajes"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @GetMapping("/messages")
    public List<MailboxItemResponse> messages(@AuthenticationPrincipal User currentUser) {
        return mailService.inbox(currentUser);
    }

    @Operation(summary = "Contadores de mi buzon",
            description = "Totales y mensajes sin leer del usuario autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contadores"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @GetMapping("/stats")
    public MailStatsResponse stats(@AuthenticationPrincipal User currentUser) {
        return mailService.stats(currentUser);
    }

    @Operation(summary = "Marcar mensaje como leido",
            description = "Marca un mensaje del buzon propio como leido. Si ya estaba leido no hace nada.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Mensaje marcado como leido"),
            @ApiResponse(responseCode = "404", description = "Mensaje no encontrado en el buzon"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @PatchMapping("/messages/{id}/read")
    public MailboxItemResponse markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return mailService.markRead(id, currentUser);
    }

    @Operation(summary = "Marcar todo el buzon como leido",
            description = "Pone todos los mensajes del buzon propio como leidos y devuelve los contadores.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Buzon marcado como leido"),
            @ApiResponse(responseCode = "401", description = "Token ausente o invalido")})
    @PostMapping("/read-all")
    public MailStatsResponse markAllRead(@AuthenticationPrincipal User currentUser) {
        return mailService.markAllRead(currentUser);
    }
}
