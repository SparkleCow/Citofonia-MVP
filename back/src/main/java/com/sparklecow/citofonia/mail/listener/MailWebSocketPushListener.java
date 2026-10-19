package com.sparklecow.citofonia.mail.listener;

import com.sparklecow.citofonia.mail.event.MailSentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Empuja la notificacion de mensaje nuevo por WebSocket a cada destinatario
 * una vez confirmada la transaccion de envio.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MailWebSocketPushListener {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMailSent(MailSentEvent event) {
        event.deliveries().forEach(delivery -> {
            messagingTemplate.convertAndSendToUser(
                    delivery.email(), "/queue/mailbox", delivery.notification());
        });
        log.debug("Notificaciones WS empujadas: {}", event.deliveries().size());
    }
}
