package com.sparklecow.citofonia.correspondence.service;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.ForbiddenException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceNotifyRequest;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceRecipientResponse;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceRequest;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceResponse;
import com.sparklecow.citofonia.correspondence.dto.CorrespondenceStatusRequest;
import com.sparklecow.citofonia.correspondence.entity.Correspondence;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceDelivery;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceStatus;
import com.sparklecow.citofonia.correspondence.repository.CorrespondenceRepository;
import com.sparklecow.citofonia.mail.dto.MailSendResponse;
import com.sparklecow.citofonia.mail.service.MailService;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
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
 * Gestion de la correspondencia recibida en el portal (paquetes, cartas,
 * documentos).
 *
 * <p>Flujo: consergeria anota la correspondencia (queda linked al apartamento
 * para su auditoria), decide para quien es dentro de la vivienda, avisa por
 * buzon a los residentes que residen en ella, les llama por el interfono y
 * decide si se entrega en la vivienda o queda en porteria para que la
 * recojan. Solo pueden recibir el aviso los residentes que residen en el
 * apartamento: los inquilinos y los propietarios que viven en sitio (un
 * propietario ausente no reside y queda excluido).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CorrespondenceService {

    private final CorrespondenceRepository correspondenceRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    /** Anota una correspondencia. Solo consergeria o administracion. */
    @Transactional
    public CorrespondenceResponse register(CorrespondenceRequest request, User actor) {
        requireStaff(actor);
        Apartment apartment = findActiveApartment(request.apartmentId());
        Instant receivedAt = request.receivedAt() != null ? request.receivedAt() : Instant.now();
        CorrespondenceDelivery delivery = request.delivery() != null
                ? request.delivery()
                : CorrespondenceDelivery.PORTERIA;
        User recipient = request.recipientId() == null
                ? null
                : findEligibleRecipient(apartment, request.recipientId());
        Correspondence correspondence = correspondenceRepository.save(new Correspondence(
                apartment,
                request.type(),
                normalize(request.description()),
                normalize(request.carrier()),
                normalize(request.trackingNumber()),
                recipient,
                delivery,
                receivedAt,
                normalize(request.notes()),
                actor.getEmail()));
        log.info("Correspondencia anotada por {} para {} ({}): {}",
                actor.getEmail(), apartment.getIdentifier(), correspondence.getId(), correspondence.getType());
        return CorrespondenceResponse.from(correspondence);
    }

    /** Listado de correspondencia del edificio (opcionalmente de una vivienda). */
    @Transactional(readOnly = true)
    public Page<CorrespondenceResponse> list(Pageable pageable, Long apartmentId) {
        Page<Correspondence> page = apartmentId == null
                ? correspondenceRepository.findAllByOrderByReceivedAtDesc(pageable)
                : correspondenceRepository.findAllByApartmentIdOrderByReceivedAtDesc(apartmentId, pageable);
        return page.map(CorrespondenceResponse::from);
    }

    /**
     * Correspondencia registrada para la vivienda del usuario autenticado.
     * Solo los residentes que residen en ella ven el historial: un propietario
     * ausente no recibe ni consulta correspondencias.
     */
    @Transactional(readOnly = true)
    public Page<CorrespondenceResponse> mine(Pageable pageable, User currentUser) {
        if (!isResident(currentUser) || !currentUser.isOccupiesApartment()
                || currentUser.getApartment() == null) {
            return Page.empty(pageable);
        }
        return correspondenceRepository
                .findAllByApartmentIdOrderByReceivedAtDesc(currentUser.getApartment().getId(), pageable)
                .map(CorrespondenceResponse::from);
    }

    /** Detalle de una correspondencia. Staff o residente de la vivienda. */
    @Transactional(readOnly = true)
    public CorrespondenceResponse getById(Long id, User currentUser) {
        Correspondence correspondence = findCorrespondence(id);
        if (!isStaff(currentUser) && !livesIn(currentUser, correspondence.getApartment())) {
            throw new ForbiddenException("No puedes consultar la correspondencia de otra vivienda");
        }
        return CorrespondenceResponse.from(correspondence);
    }

    /** Residentes de una vivienda que pueden recibir la correspondencia. */
    @Transactional(readOnly = true)
    public List<CorrespondenceRecipientResponse> recipients(Long apartmentId) {
        findActiveApartment(apartmentId);
        return userRepository.findResidentsLivingInApartment(apartmentId).stream()
                .map(CorrespondenceRecipientResponse::from)
                .toList();
    }

    /**
     * Envia la informacion de la correspondencia al buzon de los residentes
     * indicados y deja constancia del aviso en el registro.
     */
    @Transactional
    public CorrespondenceResponse notify(Long id, CorrespondenceNotifyRequest request, User actor) {
        requireStaff(actor);
        Correspondence correspondence = findCorrespondence(id);
        List<User> recipients = resolveRecipients(correspondence, request.residentIds());

        String subject = "Correspondencia para tu vivienda: " + describe(correspondence);
        String body = buildNotificationBody(correspondence);
        MailSendResponse sent = mailService.sendTo(
                recipients.stream().map(User::getId).toList(), subject, body, actor);

        correspondence.setStatus(CorrespondenceStatus.NOTIFIED);
        correspondence.setNotifiedAt(Instant.now());
        correspondence.setNotifiedTo(joinEmails(recipients));
        correspondenceRepository.save(correspondence);
        log.info("Correspondencia {} avisada a {} residente(s) por {}",
                correspondence.getId(), sent.recipientCount(), actor.getEmail());
        return CorrespondenceResponse.from(correspondence);
    }

    /**
     * La correspondencia queda en porteria: el resident tiene que pasar a
     * recogerla. Se avisa por buzon a los residentes de la vivienda.
     */
    @Transactional
    public CorrespondenceResponse holdAtDesk(Long id, User actor) {
        requireStaff(actor);
        Correspondence correspondence = findCorrespondence(id);
        correspondence.setDelivery(CorrespondenceDelivery.PORTERIA);
        if (correspondence.getStatus() == CorrespondenceStatus.PENDING
                || correspondence.getStatus() == CorrespondenceStatus.NOTIFIED) {
            correspondence.setStatus(CorrespondenceStatus.NOTIFIED);
        }
        if (correspondence.getNotifiedAt() == null) {
            correspondence.setNotifiedAt(Instant.now());
        }
        List<User> residents = userRepository.findResidentsLivingInApartment(correspondence.getApartment().getId());
        if (!residents.isEmpty()) {
            String subject = "Correspondencia en porteria: " + describe(correspondence);
            String body = buildNotificationBody(correspondence)
                    + "\n\nEsta en porteria: pasate por el portal para recogerla.";
            mailService.sendTo(residents.stream().map(User::getId).toList(), subject, body, actor);
            correspondence.setNotifiedTo(joinEmails(residents));
        }
        correspondenceRepository.save(correspondence);
        log.info("Correspondencia {} guardada en porteria por {}", correspondence.getId(), actor.getEmail());
        return CorrespondenceResponse.from(correspondence);
    }

    /** Cambia el estado de la correspondencia (entregada, devuelta...). */
    @Transactional
    public CorrespondenceResponse updateStatus(Long id, CorrespondenceStatusRequest request, User actor) {
        requireStaff(actor);
        Correspondence correspondence = findCorrespondence(id);
        correspondence.setStatus(request.status());
        if (request.delivery() != null) {
            correspondence.setDelivery(request.delivery());
        }
        if (request.status() == CorrespondenceStatus.DELIVERED && correspondence.getCollectedAt() == null) {
            correspondence.setCollectedAt(Instant.now());
        }
        correspondenceRepository.save(correspondence);
        log.info("Correspondencia {} actualizada a {} por {}",
                correspondence.getId(), request.status(), actor.getEmail());
        return CorrespondenceResponse.from(correspondence);
    }

    /**
     * Registra que un resident ha sido avisado por via telefonica (el conserje
     * le llama para notificar la correspondencia). Solo puede avisarse a quien
     * reside en la vivienda destinataria.
     */
    @Transactional
    public void markNotifiedByCall(Long id, User resident) {
        markNotifiedByCall(id, List.of(resident));
    }

    /**
     * Igual que {@link #markNotifiedByCall(Long, User)} pero para los varios
     * residentes a los que se timbre a la vez al llamar a una vivienda.
     */
    @Transactional
    public void markNotifiedByCall(Long id, Collection<User> residents) {
        Correspondence correspondence = findCorrespondence(id);
        Set<String> notified = new LinkedHashSet<>(splitEmails(correspondence.getNotifiedTo()));
        for (User resident : residents) {
            if (resident.getApartment() == null
                    || !resident.getApartment().getId().equals(correspondence.getApartment().getId())) {
                throw new BadRequestException("La correspondencia no corresponde a la vivienda del residente");
            }
            if (!resident.isOccupiesApartment()) {
                throw new BadRequestException(
                        "Este residente no reside en la vivienda y no puede recibir correspondencia");
            }
            notified.add(resident.getEmail());
        }
        if (correspondence.getNotifiedAt() == null) {
            correspondence.setNotifiedAt(Instant.now());
        }
        if (correspondence.getStatus() == CorrespondenceStatus.PENDING) {
            correspondence.setStatus(CorrespondenceStatus.NOTIFIED);
        }
        correspondence.setNotifiedTo(String.join(",", notified));
        correspondenceRepository.save(correspondence);
        log.info("Correspondencia {} notificada por llamada a {}",
                correspondence.getId(), String.join(", ", notified));
    }

    /** Busca una correspondencia por id o lanza {@link NotFoundException}. */
    @Transactional(readOnly = true)
    public Correspondence findCorrespondence(Long id) {
        return correspondenceRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Correspondencia no encontrada con id " + id));
    }

    private User findEligibleRecipient(Apartment apartment, Long recipientId) {
        return userRepository.findResidentsLivingInApartment(apartment.getId()).stream()
                .filter(user -> user.getId().equals(recipientId))
                .findFirst()
                .orElseThrow(() -> new BadRequestException(
                        "El usuario " + recipientId + " no puede recibir correspondencia: no reside en la vivienda"));
    }

    private List<User> resolveRecipients(Correspondence correspondence, List<Long> residentIds) {
        List<User> eligible = userRepository.findResidentsLivingInApartment(correspondence.getApartment().getId());
        List<User> recipients = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(residentIds)) {
            User resident = eligible.stream()
                    .filter(user -> user.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException(
                            "El usuario " + id + " no puede recibir correspondencia: no reside en la vivienda"));
            recipients.add(resident);
        }
        if (recipients.isEmpty()) {
            throw new BadRequestException("Selecciona al menos un residente de la vivienda");
        }
        return recipients;
    }

    private String describe(Correspondence correspondence) {
        if (correspondence.getDescription() != null) {
            return correspondence.getDescription();
        }
        return switch (correspondence.getType()) {
            case PAQUETE -> "un paquete";
            case CARTA -> "una carta";
            case DOCUMENTO -> "un documento";
            case OTRO -> "un envio";
        };
    }

    private String buildNotificationBody(Correspondence correspondence) {
        StringBuilder body = new StringBuilder();
        body.append("Hay una correspondencia recibida en el portal de tu vivienda (")
                .append(correspondence.getApartment().getIdentifier()).append(").");
        body.append("\n\nQue es: ").append(describe(correspondence));
        if (correspondence.getCarrier() != null) {
            body.append("\nTransportista: ").append(correspondence.getCarrier());
        }
        if (correspondence.getTrackingNumber() != null) {
            body.append("\nSeguimiento: ").append(correspondence.getTrackingNumber());
        }
        if (correspondence.getRecipient() != null) {
            body.append("\nDestinatario: ").append(
                    (correspondence.getRecipient().getFirstName() + " "
                            + correspondence.getRecipient().getLastName()).trim());
        }
        body.append("\nEntrega: ").append(correspondence.getDelivery() == CorrespondenceDelivery.PORTERIA
                ? "en porteria (pasa a recogerla)"
                : "en la vivienda");
        if (correspondence.getNotes() != null) {
            body.append("\nNotas: ").append(correspondence.getNotes());
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
            throw new ForbiddenException("Solo consergeria o administracion pueden gestionar la correspondencia");
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
