package com.sparklecow.citofonia.mail.controller;

import com.sparklecow.citofonia.mail.dto.MailSendResponse;
import com.sparklecow.citofonia.mail.dto.SendMailRequest;
import com.sparklecow.citofonia.mail.service.MailService;
import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

/**
 * Envio de mensajes al buzon de los usuarios. Exclusivo de administracion.
 * El reparto y el empuje por WebSocket lo hace {@link MailService}.
 */
@Tag(name = "Administracion de mensajes",
        description = "Envio de mensajes al buzon de los usuarios (solo ADMIN)")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin/mail")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMailController {

    private final MailService mailService;

    @Operation(summary = "Enviar mensaje a los buzones",
            description = "Copia el mensaje en el buzon de cada destinatario segun la audiencia "
                    + "(todos, residentes, consergeria o lista explicita) y notifica por WebSocket "
                    + "a los conectados. Requiere rol ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Mensaje enviado"),
            @ApiResponse(responseCode = "400", description = "Audiencia invalida o sin destinatarios"),
            @ApiResponse(responseCode = "422", description = "Errores de validacion"),
            @ApiResponse(responseCode = "403", description = "Requiere rol ADMIN")})
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailSendResponse send(
            @Valid @RequestBody SendMailRequest request,
            @AuthenticationPrincipal User actor) {
        return mailService.send(request, actor);
    }
}
