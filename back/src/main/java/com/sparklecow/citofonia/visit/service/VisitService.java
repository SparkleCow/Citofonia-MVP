package com.sparklecow.citofonia.visit.service;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.ForbiddenException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.mail.dto.MailSendResponse;
import com.sparklecow.citofonia.mail.service.MailService;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
import com.sparklecow.citofonia.common.exception.ConflictException;
import com.sparklecow.citofonia.visit.dto.VisitNotifyRequest;
import com.sparklecow.citofonia.visit.dto.VisitPreauthorizeRequest;
import com.sparklecow.citofonia.visit.dto.VisitRecipientResponse;
import com.sparklecow.citofonia.visit.dto.VisitRequest;
import com.sparklecow.citofonia.visit.dto.VisitResponse;
import com.sparklecow.citofonia.visit.dto.VisitStatusRequest;
import com.sparklecow.citofonia.visit.entity.Visit;
import com.sparklecow.citofonia.visit.entity.VisitStatus;
import com.sparklecow.citofonia.visit.repository.VisitRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gestion de las visitas al portal.
 *
 * <p>Flujo: consergeria anota la visita (queda linked al apartamento para
 * auditoria), avisa por buzon a los residentes que residen en esa vivienda y, si
 * hace falta, les llama por el interfono. Solo pueden recibir el aviso los
 * residentes que residen en el apartamento: los inquilinos y los propietarios
 * que viven en sitio (un propietario ausente no reside y queda excluido).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitRepository visitRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    /** Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para poder dictar el codigo. */
    private static final String CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 12;
    /** Antelacion maxima con la que se puede anunciar una visita. */
    static final Duration MAX_ADVANCE = Duration.ofDays(30);
    /** Margen tras la hora estimada durante el que el codigo sigue siendo valido. */
    static final Duration CODE_GRACE = Duration.ofHours(12);
    /** Tolerancia para una hora estimada "ahora mismo" (desfase de reloj del movil). */
    private static final Duration PAST_TOLERANCE = Duration.ofMinutes(15);

    private final SecureRandom random = new SecureRandom();

    /**
     * Un residente anuncia una visita para su vivienda. Devuelve la visita con el
     * codigo de acceso que el visitante presentara (como QR) en porteria.
     */
    @Transactional
    public VisitResponse preauthorize(VisitPreauthorizeRequest request, User resident) {
        if (!isResident(resident) || resident.getApartment() == null || !resident.isOccupiesApartment()) {
            throw new ForbiddenException("Solo quienes residen en una vivienda pueden autorizar visitas");
        }
        Instant now = Instant.now();
        if (request.expectedAt().isBefore(now.minus(PAST_TOLERANCE))) {
            throw new BadRequestException("La fecha y hora estimadas no pueden estar en el pasado");
        }
        if (request.expectedAt().isAfter(now.plus(MAX_ADVANCE))) {
            throw new BadRequestException("Solo puedes autorizar visitas con hasta 30 dias de antelacion");
        }
        Visit visit = new Visit(
                resident.getApartment(),
                request.visitorName().trim(),
                request.visitorDocument(),
                null,
                null,
                null,
                request.expectedAt(),
                resident.getEmail());
        visit.setReason(normalize(request.reason()));
        visit.setExpectedAt(request.expectedAt());
        visit.setStatus(VisitStatus.PREAUTHORIZED);
        visit.setAccessCode(newAccessCode());
        visit = visitRepository.save(visit);
        log.info("Visita {} preautorizada por {} para {}",
                visit.getId(), resident.getEmail(), resident.getApartment().getIdentifier());
        return VisitResponse.from(visit);
    }

    /** El residente anula una visita que habia anunciado y que aun no ha llegado. */
    @Transactional
    public VisitResponse cancelPreauthorization(Long visitId, User resident) {
        Visit visit = findVisit(visitId);
        if (!isResident(resident) || !livesIn(resident, visit.getApartment())) {
            throw new ForbiddenException("No puedes anular visitas de otra vivienda");
        }
        if (visit.getStatus() != VisitStatus.PREAUTHORIZED) {
            throw new ConflictException("Solo se pueden anular visitas preautorizadas que no han ingresado");
        }
        visit.setStatus(VisitStatus.REJECTED);
        visitRepository.save(visit);
        log.info("Preautorizacion de la visita {} anulada por {}", visit.getId(), resident.getEmail());
        return VisitResponse.from(visit);
    }

    /** Porteria consulta la visita a la que pertenece un codigo (QR) sin modificarla. */
    @Transactional(readOnly = true)
    public VisitResponse findByAccessCode(String code, User actor) {
        requireStaff(actor);
        return VisitResponse.from(findByCode(code));
    }

    /**
     * Porteria registra el ingreso de una visita preautorizada. El codigo es de
     * un solo uso y caduca {@link #CODE_GRACE} despues de la hora estimada. Se
     * avisa por buzon a quienes residen en la vivienda.
     */
    @Transactional
    public VisitResponse checkIn(String code, User actor) {
        requireStaff(actor);
        Visit visit = findByCode(code);
        if (visit.getStatus() == VisitStatus.REJECTED) {
            throw new ConflictException("El residente anulo esta autorizacion");
        }
        if (visit.getStatus() != VisitStatus.PREAUTHORIZED) {
            throw new ConflictException("Este codigo ya fue utilizado");
        }
        Instant now = Instant.now();
        if (visit.getExpectedAt() != null && now.isAfter(visit.getExpectedAt().plus(CODE_GRACE))) {
            throw new ConflictException("El codigo ha caducado");
        }
        visit.setStatus(VisitStatus.ADMITTED);
        visit.setEntryAt(now);
        List<User> residents = userRepository.findResidentsLivingInApartment(visit.getApartment().getId());
        if (!residents.isEmpty()) {
            mailService.sendTo(
                    residents.stream().map(User::getId).toList(),
                    "Tu visita ha llegado: " + visit.getVisitorName(),
                    visit.getVisitorName() + " ha ingresado con la autorizacion de tu vivienda ("
                            + visit.getApartment().getIdentifier() + ").\n\nDocumento: "
                            + visit.getVisitorDocument() + "\n\nRegistrado por consergeria.",
                    actor);
            visit.setNotifiedAt(now);
            visit.setNotifiedTo(joinEmails(residents));
        }
        visitRepository.save(visit);
        log.info("Ingreso de la visita preautorizada {} registrado por {}", visit.getId(), actor.getEmail());
        return VisitResponse.from(visit);
    }

    private Visit findByCode(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
        return visitRepository.findByAccessCode(normalized)
                .orElseThrow(() -> new NotFoundException("Codigo de visita no valido"));
    }

    private String newAccessCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder code = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }
            if (visitRepository.findByAccessCode(code.toString()).isEmpty()) {
                return code.toString();
            }
        }
        throw new ConflictException("No se pudo generar el codigo de acceso; intentalo de nuevo");
    }

    /** Anota una visita. Solo consergeria o administracion. */
    @Transactional
    public VisitResponse register(VisitRequest request, User actor) {
        requireStaff(actor);
        Apartment apartment = findActiveApartment(request.apartmentId());
        Instant entryAt = request.entryAt() != null ? request.entryAt() : Instant.now();
        Visit visit = visitRepository.save(new Visit(
                apartment,
                request.visitorName().trim(),
                normalize(request.visitorDocument()),
                normalize(request.visitorPhone()),
                normalize(request.visitorCompany()),
                normalize(request.notes()),
                entryAt,
                actor.getEmail()));
        visit.setReason(normalize(request.reason()));
        log.info("Visita anotada por {} para {} ({}): {}",
                actor.getEmail(), apartment.getIdentifier(), visit.getId(), visit.getVisitorName());
        return VisitResponse.from(visit);
    }

    /** Listado de visitas del edificio (opcionalmente de una vivienda). */
    @Transactional(readOnly = true)
    public Page<VisitResponse> list(Pageable pageable, Long apartmentId) {
        Page<Visit> page = apartmentId == null
                ? visitRepository.findAllByOrderByEntryAtDesc(pageable)
                : visitRepository.findAllByApartmentIdOrderByEntryAtDesc(apartmentId, pageable);
        return page.map(VisitResponse::from);
    }

    /** Detalle de una visita. Staff o residente de la vivienda. */
    @Transactional(readOnly = true)
    public VisitResponse getById(Long id, User currentUser) {
        Visit visit = findVisit(id);
        if (!isStaff(currentUser) && !livesIn(currentUser, visit.getApartment())) {
            throw new ForbiddenException("No puedes consultar las visitas de otra vivienda");
        }
        return VisitResponse.from(visit);
    }

    /**
     * Visitas registradas para la vivienda del usuario autenticado. Solo las
     * residence reales ven el historial: un propietario ausente no recibe ni
     * consulta visitas.
     */
    @Transactional(readOnly = true)
    public Page<VisitResponse> mine(Pageable pageable, User currentUser) {
        if (!isResident(currentUser) || !currentUser.isOccupiesApartment()
                || currentUser.getApartment() == null) {
            return Page.empty(pageable);
        }
        return visitRepository
                .findAllByApartmentIdOrderByEntryAtDesc(currentUser.getApartment().getId(), pageable)
                .map(VisitResponse::from);
    }

    /** Residentes de una vivienda que pueden recibir el aviso de una visita. */
    @Transactional(readOnly = true)
    public List<VisitRecipientResponse> recipients(Long apartmentId) {
        findActiveApartment(apartmentId);
        return userRepository.findResidentsLivingInApartment(apartmentId).stream()
                .map(VisitRecipientResponse::from)
                .toList();
    }

    /**
     * Envia la informacion de la visita al buzon de los residentes indicados y
     * deja constancia del aviso en el registro de la visita.
     */
    @Transactional
    public VisitResponse notify(Long visitId, VisitNotifyRequest request, User actor) {
        requireStaff(actor);
        Visit visit = findVisit(visitId);
        List<User> recipients = resolveRecipients(visit, request.residentIds());

        String subject = "Visita en tu vivienda: " + visit.getVisitorName();
        String body = buildNotificationBody(visit);
        MailSendResponse sent = mailService.sendTo(
                recipients.stream().map(User::getId).toList(), subject, body, actor);

        visit.setStatus(VisitStatus.NOTIFIED);
        visit.setNotifiedAt(Instant.now());
        visit.setNotifiedTo(joinEmails(recipients));
        visitRepository.save(visit);
        log.info("Visita {} avisada a {} residente(s) por {}",
                visit.getId(), sent.recipientCount(), actor.getEmail());
        return VisitResponse.from(visit);
    }

    /** Cambia el estado de la visita (autorizada, rechazada, cerrada...). */
    @Transactional
    public VisitResponse updateStatus(Long visitId, VisitStatusRequest request, User actor) {
        requireStaff(actor);
        Visit visit = findVisit(visitId);
        visit.setStatus(request.status());
        if (request.exitAt() != null) {
            visit.setExitAt(request.exitAt());
        } else if (request.status() == VisitStatus.CLOSED && visit.getExitAt() == null) {
            visit.setExitAt(Instant.now());
        }
        visitRepository.save(visit);
        log.info("Visita {} actualizada a {} por {}", visit.getId(), request.status(), actor.getEmail());
        return VisitResponse.from(visit);
    }

    /**
     * Registra que un resident ha sido avisado por via telefonica (el conserje
     * le llama para notificar la visita). Solo puede avisarse a quien reside
     * en la vivienda visitada.
     */
    @Transactional
    public void markNotifiedByCall(Long visitId, User resident) {
        markNotifiedByCall(visitId, List.of(resident));
    }

    /**
     * Igual que {@link #markNotifiedByCall(Long, User)} pero para los varios
     * residentes a los que se timbre a la vez al llamar a una vivienda.
     */
    @Transactional
    public void markNotifiedByCall(Long visitId, Collection<User> residents) {
        Visit visit = findVisit(visitId);
        Set<String> notified = new LinkedHashSet<>(splitEmails(visit.getNotifiedTo()));
        for (User resident : residents) {
            if (resident.getApartment() == null
                    || !resident.getApartment().getId().equals(visit.getApartment().getId())) {
                throw new BadRequestException("La visita no corresponde a la vivienda del residente");
            }
            if (!resident.isOccupiesApartment()) {
                throw new BadRequestException(
                        "Este residente no reside en la vivienda y no puede recibir visitas");
            }
            notified.add(resident.getEmail());
        }
        if (visit.getNotifiedAt() == null) {
            visit.setNotifiedAt(Instant.now());
        }
        if (visit.getStatus() == VisitStatus.PENDING) {
            visit.setStatus(VisitStatus.NOTIFIED);
        }
        visit.setNotifiedTo(String.join(",", notified));
        visitRepository.save(visit);
        log.info("Visita {} notificada por llamada a {}", visit.getId(), String.join(", ", notified));
    }

    /** Busca una visita por id o lanza {@link NotFoundException}. */
    @Transactional(readOnly = true)
    public Visit findVisit(Long id) {
        return visitRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Visita no encontrada con id " + id));
    }

    private List<User> resolveRecipients(Visit visit, List<Long> residentIds) {
        List<User> eligible = userRepository.findResidentsLivingInApartment(visit.getApartment().getId());
        List<User> recipients = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(residentIds)) {
            User resident = eligible.stream()
                    .filter(user -> user.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException(
                            "El usuario " + id + " no puede recibir visitas: no reside en la vivienda"));
            recipients.add(resident);
        }
        if (recipients.isEmpty()) {
            throw new BadRequestException("Selecciona al menos un residente de la vivienda");
        }
        return recipients;
    }

    private String buildNotificationBody(Visit visit) {
        StringBuilder body = new StringBuilder();
        body.append("Hay un visitante en el portal de tu vivienda (")
                .append(visit.getApartment().getIdentifier()).append(").");
        body.append("\n\nVisitante: ").append(visit.getVisitorName());
        if (visit.getVisitorCompany() != null) {
            body.append("\nEmpresa: ").append(visit.getVisitorCompany());
        }
        if (visit.getVisitorDocument() != null) {
            body.append("\nDocumento: ").append(visit.getVisitorDocument());
        }
        if (visit.getVisitorPhone() != null) {
            body.append("\nTelefono: ").append(visit.getVisitorPhone());
        }
        if (visit.getReason() != null) {
            body.append("\nMotivo: ").append(visit.getReason());
        }
        if (visit.getNotes() != null) {
            body.append("\nObservaciones: ").append(visit.getNotes());
        }
        body.append("\n\nRegistrado por consergeria.");
        return body.toString();
    }

    private Apartment findActiveApartment(Long id) {
        if (id == null) {
            throw new BadRequestException("El apartamento es obligatorio");
        }
        return apartmentRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Apartamento no encontrado con id " + id));
    }

    private boolean livesIn(User user, Apartment apartment) {
        return user.getApartment() != null
                && user.getApartment().getId().equals(apartment.getId())
                && user.isOccupiesApartment();
    }

    private boolean isResident(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.USER);
    }

    private boolean isStaff(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.CONCIERGE
                || role.getName() == RoleName.ADMIN);
    }

    private void requireStaff(User actor) {
        if (!isStaff(actor)) {
            throw new ForbiddenException("Solo consergeria o administracion pueden gestionar visitas");
        }
    }

    private String joinEmails(List<User> recipients) {
        return recipients.stream().map(User::getEmail).distinct().reduce((a, b) -> a + "," + b).orElse(null);
    }

    private List<String> splitEmails(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split(","));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
