package com.sparklecow.citofonia.emergency.listener;

import com.sparklecow.citofonia.emergency.dto.EmergencyEvent;
import com.sparklecow.citofonia.emergency.dto.EmergencyResponse;
import com.sparklecow.citofonia.notification.push.PushNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Difunde las emergencias tras confirmar la transaccion:
 * WebSocket a todos los clientes conectados y push (si esta habilitado) a los destinatarios.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmergencyBroadcastListener {

    public static final String TOPIC = "/topic/emergencies";

    private final SimpMessagingTemplate messagingTemplate;
    private final PushNotificationService pushNotificationService;

    /** Lo que viaja por WebSocket: sin la lista de destinatarios (privacidad). */
    public record EmergencyBroadcast(EmergencyEvent.Type type, EmergencyResponse emergency) {
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEmergency(EmergencyEvent event) {
        messagingTemplate.convertAndSend(TOPIC, new EmergencyBroadcast(event.type(), event.emergency()));
        if (event.type() == EmergencyEvent.Type.TRIGGERED && !event.recipientEmails().isEmpty()) {
            String body = event.emergency().message() != null
                    ? event.emergency().message()
                    : "Alerta general activada. Abre la app para ver las indicaciones.";
            pushNotificationService.sendToEmails(event.recipientEmails(), "EMERGENCIA en el edificio", body,
                    java.util.Map.of("type", "EMERGENCY", "emergencyId", event.emergency().id()));
        }
        log.debug("Emergencia {} difundida ({})", event.emergency().id(), event.type());
    }
}
