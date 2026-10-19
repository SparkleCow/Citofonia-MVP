package com.sparklecow.citofonia.call.listener;

import com.sparklecow.citofonia.call.service.CallService;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Cierra las llamadas de un usuario cuando su sesion WebSocket se cae (cierra
 * la pestana, pierde la red...), avisando a la contraparte.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CallDisconnectListener {

    private final CallService callService;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user != null) {
            callService.disconnect(user.getName());
        }
    }
}
