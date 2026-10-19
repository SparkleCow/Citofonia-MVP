package com.sparklecow.citofonia.call.controller;

import com.sparklecow.citofonia.call.CallException;
import com.sparklecow.citofonia.call.dto.CallEnvelope;
import com.sparklecow.citofonia.call.dto.CallInviteRequest;
import com.sparklecow.citofonia.call.dto.CallRequest;
import com.sparklecow.citofonia.call.dto.CallSignalRequest;
import com.sparklecow.citofonia.call.service.CallService;
import com.sparklecow.citofonia.user.entity.User;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

/**
 * Punto de entrada STOMP de las llamadas.
 *
 * <p>El front envia a {@code /app/call.*} y las respuestas/avisos llegan por
 * la cola personal {@code /user/queue/calls}. El usuario se obtiene de la
 * sesion WebSocket (autenticada con JWT en el CONNECT), nunca del payload.</p>
 */
@Controller
@RequiredArgsConstructor
public class CallStompController {

    private final CallService callService;

    @MessageMapping("/call.invite")
    public void invite(Principal principal, @Payload CallInviteRequest request) {
        callService.invite(currentUser(principal), request);
    }

    /** Llamada de un residente a porteria (timbra a toda la vigilancia conectada). */
    @MessageMapping("/call.portal")
    public void portal(Principal principal, @Payload CallRequest request) {
        callService.invitePortal(currentUser(principal), request);
    }

    @MessageMapping("/call.accept")
    public void accept(Principal principal, @Payload CallRequest request) {
        callService.accept(currentUser(principal), request);
    }

    @MessageMapping("/call.reject")
    public void reject(Principal principal, @Payload CallRequest request) {
        callService.reject(currentUser(principal), request);
    }

    @MessageMapping("/call.signal")
    public void signal(Principal principal, @Payload CallSignalRequest request) {
        callService.signal(currentUser(principal), request);
    }

    @MessageMapping("/call.end")
    public void end(Principal principal, @Payload CallRequest request) {
        callService.end(currentUser(principal), request);
    }

    /** Cualquier error de negocio vuelve al usuario como un evento ERROR. */
    @MessageExceptionHandler(CallException.class)
    @SendToUser("/queue/calls")
    public CallEnvelope handleCallException(CallException exception) {
        return CallEnvelope.error(exception.getMessage());
    }

    private User currentUser(Principal principal) {
        if (principal instanceof Authentication authentication && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw new CallException("Sesion no valida");
    }
}
