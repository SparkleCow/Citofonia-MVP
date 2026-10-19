package com.sparklecow.citofonia.mail.service;

import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.mail.MailAudience;
import com.sparklecow.citofonia.mail.dto.MailNotificationResponse;
import com.sparklecow.citofonia.mail.dto.MailSendResponse;
import com.sparklecow.citofonia.mail.dto.MailStatsResponse;
import com.sparklecow.citofonia.mail.dto.MailboxItemResponse;
import com.sparklecow.citofonia.mail.dto.SendMailRequest;
import com.sparklecow.citofonia.mail.entity.MailMessage;
import com.sparklecow.citofonia.mail.entity.Mailbox;
import com.sparklecow.citofonia.mail.entity.MailboxMessage;
import com.sparklecow.citofonia.mail.event.MailSentEvent;
import com.sparklecow.citofonia.mail.repository.MailMessageRepository;
import com.sparklecow.citofonia.mail.repository.MailboxMessageRepository;
import com.sparklecow.citofonia.mail.repository.MailboxRepository;
import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sistema de mensajeria interna (buzon).
 *
 * <p>Administracion envia un mensaje; cada destinatario obtiene su copia en
 * su buzon con estado de lectura propio. Tras confirmar la transaccion se
 * publica un evento que empuja la notificacion por WebSocket a la cola
 * {@code /user/queue/mailbox} de cada destinatario.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final UserRepository userRepository;
    private final MailboxRepository mailboxRepository;
    private final MailMessageRepository messageRepository;
    private final MailboxMessageRepository mailboxMessageRepository;
    private final ApplicationEventPublisher eventPublisher;

    /** Guarda el mensaje y reparte una copia por cada buzon destinatario. */
    @Transactional
    public MailSendResponse send(SendMailRequest request, User actor) {
        List<User> recipients = resolveRecipients(request);
        if (recipients.isEmpty()) {
            throw new BadRequestException("No hay destinatarios para esa audiencia");
        }

        MailMessage message = messageRepository.save(new MailMessage(
                request.subject().trim(),
                request.body().trim(),
                actor.getEmail(),
                request.audience().name()));

        List<MailSentEvent.Delivery> deliveries = new ArrayList<>();
        for (User recipient : recipients) {
            Mailbox mailbox = findOrCreateMailbox(recipient);
            MailboxMessage item = mailboxMessageRepository.save(new MailboxMessage(mailbox, message));
            long unread = mailboxMessageRepository.countUnreadByUserId(recipient.getId());
            deliveries.add(new MailSentEvent.Delivery(
                    recipient.getEmail(), MailNotificationResponse.of(item, unread)));
        }

        eventPublisher.publishEvent(new MailSentEvent(deliveries));
        log.info("Mensaje '{}' enviado por {} a {} buzones",
                message.getSubject(), actor.getEmail(), deliveries.size());
        return new MailSendResponse(message.getId(), message.getSubject(), deliveries.size());
    }

    /** Buzon del usuario ordenado del mas reciente al mas antiguo. */
    @Transactional(readOnly = true)
    public List<MailboxItemResponse> inbox(User user) {
        return mailboxRepository.findByUserId(user.getId())
                .map(mailbox -> mailboxMessageRepository
                        .findByMailboxIdOrderByCreatedAtDesc(mailbox.getId()).stream()
                        .map(MailboxItemResponse::from)
                        .toList())
                .orElseGet(List::of);
    }

    /** Totales y no leidos del buzon del usuario. */
    @Transactional(readOnly = true)
    public MailStatsResponse stats(User user) {
        return mailboxRepository.findByUserId(user.getId())
                .map(mailbox -> new MailStatsResponse(
                        mailboxMessageRepository.countByUserId(user.getId()),
                        mailboxMessageRepository.countUnreadByUserId(user.getId())))
                .orElseGet(() -> new MailStatsResponse(0, 0));
    }

    /** Marca un mensaje del buzon propio como leido. */
    @Transactional
    public MailboxItemResponse markRead(Long id, User user) {
        MailboxMessage item = findItem(id, user);
        if (!item.isRead()) {
            item.setRead(true);
            item.setReadAt(Instant.now());
            mailboxMessageRepository.save(item);
        }
        return MailboxItemResponse.from(item);
    }

    /** Marca todo el buzon como leido y devuelve los nuevos contadores. */
    @Transactional
    public MailStatsResponse markAllRead(User user) {
        Mailbox mailbox = mailboxRepository.findByUserId(user.getId()).orElse(null);
        if (mailbox != null) {
            mailboxMessageRepository.findByMailboxIdOrderByCreatedAtDesc(mailbox.getId()).stream()
                    .filter(item -> !item.isRead())
                    .forEach(item -> {
                        item.setRead(true);
                        item.setReadAt(Instant.now());
                        mailboxMessageRepository.save(item);
                    });
        }
        return stats(user);
    }

    private MailboxMessage findItem(Long id, User user) {
        return mailboxMessageRepository.findByIdAndMailboxUserId(id, user.getId())
                .orElseThrow(() -> new NotFoundException("Mensaje no encontrado con id " + id));
    }

    private Mailbox findOrCreateMailbox(User user) {
        return mailboxRepository.findByUserId(user.getId())
                .orElseGet(() -> mailboxRepository.save(new Mailbox(user)));
    }

    private List<User> resolveRecipients(SendMailRequest request) {
        List<User> active = userRepository.findAllByDeletedFalse();
        return switch (request.audience()) {
            case ALL -> active;
            case RESIDENTS -> active.stream().filter(u -> hasRole(u, RoleName.USER)).toList();
            case SECURITY -> active.stream().filter(u -> hasRole(u, RoleName.SECURITY)).toList();
            case CUSTOM -> resolveCustom(request.recipientIds(), active);
        };
    }

    private List<User> resolveCustom(List<Long> recipientIds, List<User> active) {
        if (recipientIds == null || recipientIds.isEmpty()) {
            throw new BadRequestException("Indica al menos un destinatario");
        }
        Map<Long, User> byId = active.stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<User> users = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(recipientIds)) {
            User user = byId.get(id);
            if (user == null) {
                throw new BadRequestException("Destinatario no valido: " + id);
            }
            users.add(user);
        }
        return users;
    }

    private boolean hasRole(User user, RoleName roleName) {
        for (Role role : user.getRoles()) {
            if (role.getName() == roleName) {
                return true;
            }
        }
        return false;
    }
}
