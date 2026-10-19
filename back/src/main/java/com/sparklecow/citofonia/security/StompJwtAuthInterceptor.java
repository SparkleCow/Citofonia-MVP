package com.sparklecow.citofonia.security;

import com.sparklecow.citofonia.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Autenticacion del WebSocket en el frame {@code CONNECT} de STOMP.
 *
 * <p>El cliente envia {@code Authorization: Bearer <jwt>} como cabecera del
 * CONNECT. El token se valida con {@link JwtService} y la cuenta se carga de
 * BD (respetando borrado logico); la {@link Authentication} resultante se
 * asocia a la sesion para que los destinos {@code /user/queue/...}
 * funcionen en las siguientes frames.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompJwtAuthInterceptor implements ChannelInterceptor {

    /** Clave donde se conserva la autenticacion en los atributos de sesion. */
    static final String AUTH_ATTRIBUTE = "citofonia.stomp.auth";

    private final JwtService jwtService;
    private final DatabaseUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            accessor.setUser(authenticate(accessor));
            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put(AUTH_ATTRIBUTE, accessor.getUser());
            }
            log.info("Sesion WebSocket autenticada: {}", accessor.getUser().getName());
            return message;
        }

        // Frames posteriores: si el usuario aun no esta asociado, lo restauramos
        // desde los atributos de la sesion (compartidos entre frames).
        if (accessor.getUser() == null && accessor.getSessionAttributes() != null) {
            Object saved = accessor.getSessionAttributes().get(AUTH_ATTRIBUTE);
            if (saved instanceof Authentication authentication) {
                accessor.setUser(authentication);
            }
        }
        return message;
    }

    private Authentication authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new AccessDeniedException("Falta la cabecera Authorization en el frame CONNECT");
        }
        try {
            String subject = jwtService.decode(header.substring(7)).getSubject();
            User user = (User) userDetailsService.loadUserByUsername(subject);
            return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        } catch (UsernameNotFoundException | AccessDeniedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AccessDeniedException("Token WebSocket invalido o expirado");
        }
    }
}
