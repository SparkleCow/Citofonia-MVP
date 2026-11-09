package com.sparklecow.citofonia.emergency.service;

import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.ForbiddenException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.common.exception.TooManyRequestsException;
import com.sparklecow.citofonia.config.PanicProperties;
import com.sparklecow.citofonia.emergency.dto.EmergencyEvent;
import com.sparklecow.citofonia.emergency.dto.EmergencyRequest;
import com.sparklecow.citofonia.emergency.dto.EmergencyResolveRequest;
import com.sparklecow.citofonia.emergency.dto.EmergencyResponse;
import com.sparklecow.citofonia.emergency.entity.Emergency;
import com.sparklecow.citofonia.emergency.entity.EmergencyStatus;
import com.sparklecow.citofonia.emergency.repository.EmergencyRepository;
import com.sparklecow.citofonia.mail.service.MailService;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Alerta general del edificio.
 * <ul>
 *   <li>El codigo de seguridad ({@code app.panic.code}) solo se valida aqui; nunca viaja al cliente.</li>
 *   <li>Se limitan los intentos fallidos por usuario para impedir adivinar el codigo.</li>
 *   <li>Avisa a residentes, consergeria y administracion: WebSocket, buzon (persistente) y push
 *       si esta configurado.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmergencyService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration FAILED_WINDOW = Duration.ofMinutes(10);

    private final EmergencyRepository emergencyRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final PanicProperties panicProperties;
    private final ApplicationEventPublisher eventPublisher;

    private final Map<Long, Deque<Instant>> failedAttempts = new ConcurrentHashMap<>();

    @Transactional
    public EmergencyResponse trigger(EmergencyRequest request, User actor) {
        checkAttempts(actor);
        if (!codeMatches(request.code())) {
            registerFailure(actor);
            log.warn("Codigo de emergencia incorrecto introducido por {}", actor.getEmail());
            throw new BadRequestException("El codigo de seguridad no es correcto");
        }
        failedAttempts.remove(actor.getId());

        String name = (actor.getFirstName() + " " + actor.getLastName()).trim();
        String apartment = actor.getApartment() != null ? actor.getApartment().getIdentifier() : null;
        String message = request.message() == null || request.message().isBlank() ? null : request.message().trim();
        Emergency emergency = new Emergency(actor.getEmail(), name, apartment, message);

        List<User> recipients = userRepository.findAllByDeletedFalse().stream()
                .filter(User::isApproved)
                .filter(User::isEnabled)
                .filter(user -> !user.getId().equals(actor.getId()))
                .filter(user -> user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.USER
                        || role.getName() == RoleName.CONCIERGE
                        || role.getName() == RoleName.ADMIN))
                .toList();
        emergency.setNotifiedCount(recipients.size());
        emergency = emergencyRepository.save(emergency);

        // Copia persistente en el buzon para quien no tenga la app abierta en ese momento.
        if (!recipients.isEmpty()) {
            String subject = "EMERGENCIA en el edificio";
            String body = "Se ha activado la alerta general"
                    + (message != null ? ": " + message : ".")
                    + "\n\nActivada por: " + name + (apartment != null ? " (apto. " + apartment + ")" : "")
                    + "\nSigue las indicaciones de porteria y del plan de emergencia.";
            mailService.sendTo(recipients.stream().map(User::getId).toList(), subject, body, actor);
        }

        EmergencyResponse response = EmergencyResponse.from(emergency);
        eventPublisher.publishEvent(new EmergencyEvent(EmergencyEvent.Type.TRIGGERED, response,
                recipients.stream().map(User::getEmail).toList()));
        log.warn("EMERGENCIA {} activada por {}: {} usuario(s) avisados",
                emergency.getId(), actor.getEmail(), recipients.size());
        return response;
    }

    @Transactional
    public EmergencyResponse resolve(Long id, EmergencyResolveRequest request, User actor) {
        requireStaff(actor);
        Emergency emergency = emergencyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Emergencia no encontrada con id " + id));
        if (emergency.getStatus() == EmergencyStatus.RESOLVED) {
            throw new BadRequestException("La emergencia ya estaba resuelta");
        }
        emergency.setStatus(EmergencyStatus.RESOLVED);
        emergency.setResolvedAt(Instant.now());
        emergency.setResolvedByEmail(actor.getEmail());
        if (request != null && request.notes() != null && !request.notes().isBlank()) {
            emergency.setResolutionNotes(request.notes().trim());
        }
        EmergencyResponse response = EmergencyResponse.from(emergency);
        eventPublisher.publishEvent(new EmergencyEvent(EmergencyEvent.Type.RESOLVED, response, List.of()));
        log.info("Emergencia {} resuelta por {}", id, actor.getEmail());
        return response;
    }

    /** Alertas en curso: cualquier usuario autenticado (para mostrarlas al abrir la app). */
    @Transactional(readOnly = true)
    public List<EmergencyResponse> active() {
        return emergencyRepository.findAllByStatusOrderByCreatedAtDesc(EmergencyStatus.ACTIVE).stream()
                .map(EmergencyResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<EmergencyResponse> history(Pageable pageable) {
        return emergencyRepository.findAllByOrderByCreatedAtDesc(pageable).map(EmergencyResponse::from);
    }

    @Transactional(readOnly = true)
    public long activeCount() {
        return emergencyRepository.countByStatus(EmergencyStatus.ACTIVE);
    }

    private boolean codeMatches(String code) {
        if (code == null) {
            return false;
        }
        // Comparacion en tiempo constante.
        return MessageDigest.isEqual(
                panicProperties.code().getBytes(StandardCharsets.UTF_8),
                code.trim().getBytes(StandardCharsets.UTF_8));
    }

    private void checkAttempts(User actor) {
        Deque<Instant> attempts = failedAttempts.get(actor.getId());
        if (attempts == null) {
            return;
        }
        synchronized (attempts) {
            Instant limit = Instant.now().minus(FAILED_WINDOW);
            attempts.removeIf(at -> at.isBefore(limit));
            if (attempts.size() >= MAX_FAILED_ATTEMPTS) {
                throw new TooManyRequestsException(
                        "Demasiados codigos incorrectos. Espera unos minutos o contacta con porteria.");
            }
        }
    }

    private void registerFailure(User actor) {
        Deque<Instant> attempts = failedAttempts.computeIfAbsent(actor.getId(), id -> new ArrayDeque<>());
        synchronized (attempts) {
            attempts.addLast(Instant.now());
        }
    }

    private void requireStaff(User actor) {
        boolean staff = actor.getRoles().stream().anyMatch(role -> role.getName() == RoleName.ADMIN
                || role.getName() == RoleName.CONCIERGE);
        if (!staff) {
            throw new ForbiddenException("Solo consergeria o administracion pueden resolver emergencias");
        }
    }
}
