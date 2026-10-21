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
import com.sparklecow.citofonia.visit.dto.VisitNotifyRequest;
import com.sparklecow.citofonia.visit.dto.VisitRecipientResponse;
import com.sparklecow.citofonia.visit.dto.VisitRequest;
import com.sparklecow.citofonia.visit.dto.VisitResponse;
import com.sparklecow.citofonia.visit.dto.VisitStatusRequest;
import com.sparklecow.citofonia.visit.entity.Visit;
import com.sparklecow.citofonia.visit.entity.VisitStatus;
import com.sparklecow.citofonia.visit.repository.VisitRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
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
        if (visit.getNotes() != null) {
            body.append("\nMotivo: ").append(visit.getNotes());
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
