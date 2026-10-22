package com.sparklecow.citofonia.call.service;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.call.CallException;
import com.sparklecow.citofonia.call.CallSession;
import com.sparklecow.citofonia.call.dto.CallApartmentOption;
import com.sparklecow.citofonia.call.dto.CallApartmentRequest;
import com.sparklecow.citofonia.call.dto.CallEnvelope;
import com.sparklecow.citofonia.call.dto.CallInviteRequest;
import com.sparklecow.citofonia.call.dto.CallPanicRequest;
import com.sparklecow.citofonia.call.dto.CallRequest;
import com.sparklecow.citofonia.call.dto.CallResidentItem;
import com.sparklecow.citofonia.call.dto.CallSignalRequest;
import com.sparklecow.citofonia.call.dto.CallStaffItem;
import com.sparklecow.citofonia.call.dto.ResidentDirectoryItem;
import com.sparklecow.citofonia.common.exception.ApiException;
import com.sparklecow.citofonia.config.PanicProperties;
import com.sparklecow.citofonia.correspondence.service.CorrespondenceService;
import com.sparklecow.citofonia.mail.service.MailService;
import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
import com.sparklecow.citofonia.visit.service.VisitService;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Gestiona las llamadas de audio entre consergeria y residentes.
 *
 * <p>El backend solo actua como centralita de senalizacion: valida permisos y
 * reenvia los mensajes ({@link CallEnvelope}) por la cola personal
 * {@code /user/queue/calls} de cada participante. El audio viaja directo
 * entre los navegadores mediante WebRTC (P2P).</p>
 *
 * <p>Hay tres flujos: la consergeria llama a un residente concreto
 * ({@code /app/call.invite}), la consergeria llama a una vivienda entera
 * ({@code /app/call.apartment}), que timbra a la vez a todos los residentes que
 * residen en ella, y un residente llama a porteria
 * ({@code /app/call.portal}), que timbra a toda la consergeria conectada; en
 * los dos ultimos el primero que acepta atiende y al resto se le cierra el
 * aviso.</p>
 *
 * <p>El estado de las llamadas vive en memoria: coherente con el broker
 * simple de Spring y suficiente para una unica instancia.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CallService {

    private static final String USER_QUEUE = "/queue/calls";
    private static final String PORTAL_LABEL = "Porteria";

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final SimpUserRegistry userRegistry;
    private final VisitService visitService;
    private final CorrespondenceService correspondenceService;
    private final MailService mailService;
    private final PanicProperties panicProperties;

    /** Llamadas en curso indexadas por identificador de llamada. */
    private final Map<String, CallSession> sessions = new ConcurrentHashMap<>();

    /** Residentes con vivienda vinculada a los que se puede llamar. */
    public List<ResidentDirectoryItem> listResidents() {
        return userRepository.findResidentsWithApartment().stream()
                .map(user -> new ResidentDirectoryItem(
                        user.getId(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getEmail(),
                        user.getApartment().getIdentifier()))
                .toList();
    }

    /**
     * Apartamentos activos con el numero de residentes vinculados.
     *
     * <p>Primer nivel del filtrado del panel de llamadas de administracion:
     * se elige la vivienda y despues a que resident de esa vivienda se
     * quiere llamar.</p>
     */
    public List<CallApartmentOption> listCallApartments() {
        Map<Long, Long> residentsByApartment = userRepository.findAllByDeletedFalse().stream()
                .filter(user -> user.getApartment() != null)
                .filter(user -> hasRole(user, RoleName.USER))
                .collect(Collectors.groupingBy(user -> user.getApartment().getId(), Collectors.counting()));
        return apartmentRepository.findAllByDeletedFalse().stream()
                .sorted(Comparator.comparing(Apartment::getIdentifier, String.CASE_INSENSITIVE_ORDER))
                .map(apartment -> new CallApartmentOption(
                        apartment.getId(),
                        apartment.getIdentifier(),
                        apartment.getBlock(),
                        apartment.getFloor(),
                        residentsByApartment.getOrDefault(apartment.getId(), 0L).intValue()))
                .toList();
    }

    /**
     * Residentes vinculados a una vivienda concreta.
     *
     * <p>Segundo nivel del filtrado del panel de llamadas: con el apartamento
     * ya elegido, aqui se escoge a quien llamar.</p>
     */
    public List<CallResidentItem> listApartmentResidents(Long apartmentId) {
        Apartment apartment = apartmentRepository.findByIdAndDeletedFalse(apartmentId)
                .orElseThrow(() -> new CallException("El apartamento no existe"));
        return userRepository.findAllByApartmentIdAndDeletedFalse(apartment.getId()).stream()
                .filter(user -> hasRole(user, RoleName.USER))
                .map(user -> new CallResidentItem(
                        user.getId(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getEmail(),
                        apartment.getIdentifier(),
                        user.isOwner(),
                        user.isOccupiesApartment(),
                        user.isEnabled()))
                .toList();
    }

    /**
     * Personal de porteria (conserjeria y administracion) al que la
     * administracion puede llamar por el citofono.
     */
    public List<CallStaffItem> listStaff() {
        return userRepository.findAllByDeletedFalse().stream()
                .filter(user -> hasRole(user, RoleName.CONCIERGE) || hasRole(user, RoleName.ADMIN))
                .filter(User::isEnabled)
                .sorted(Comparator.comparing((User user) -> user.getFirstName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(User::getLastName, String.CASE_INSENSITIVE_ORDER))
                .map(user -> new CallStaffItem(
                        user.getId(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getEmail(),
                        user.getRoles().stream()
                                .map(Role::getName)
                                .collect(Collectors.toCollection(LinkedHashSet::new))))
                .toList();
    }

    /**
     * Invita a un residente (o al personal de porteria) a una llamada.
     *
     * <p>Solo administracion puede llamar al personal de porteria; la
     * consergeria se limita a llamar a los residentes.</p>
     */
    public void invite(User caller, CallInviteRequest request) {
        requireStaff(caller);
        String callId = requireText(request.callId(), "Falta el identificador de llamada");
        String targetEmail = requireText(request.targetEmail(), "Falta el destinatario").toLowerCase();

        if (caller.getEmail().equalsIgnoreCase(targetEmail)) {
            throw new CallException("No puedes llamarte a ti mismo");
        }
        User callee = userRepository.findByEmailAndDeletedFalse(targetEmail)
                .orElseThrow(() -> new CallException("El destinatario no existe o esta dado de baja"));
        boolean calleeIsResident = hasRole(callee, RoleName.USER);
        boolean calleeIsStaff = hasRole(callee, RoleName.CONCIERGE) || hasRole(callee, RoleName.ADMIN);
        if (!calleeIsResident && !calleeIsStaff) {
            throw new CallException("Solo se puede llamar a residentes o al personal de porteria");
        }
        if (calleeIsStaff && !hasRole(caller, RoleName.ADMIN)) {
            throw new CallException("Solo administracion puede llamar al personal de porteria");
        }
        if (!callee.isEnabled()) {
            throw new CallException("La cuenta del destinatario esta deshabilitada");
        }
        if (sessions.containsKey(callId)) {
            throw new CallException("La llamada ya existe");
        }
        if (findByParticipant(caller.getEmail()) != null) {
            throw new CallException("Ya tienes una llamada en curso");
        }
        if (findByParticipant(targetEmail) != null) {
            throw new CallException("El destinatario esta en otra llamada");
        }
        if (calleeIsResident) {
            if (request.visitId() != null) {
                linkVisit(request.visitId(), callee);
            }
            if (request.correspondenceId() != null) {
                linkCorrespondence(request.correspondenceId(), callee);
            }
        }

        CallSession session = new CallSession(callId, caller.getEmail(), List.of(targetEmail), false);
        sessions.put(callId, session);
        push(targetEmail, CallEnvelope.invite(callId, caller));
        log.info("Llamada {} iniciada por {} hacia {}", callId, caller.getEmail(), targetEmail);
    }

    /**
     * La consergeria llama a una vivienda: timbra a la vez a todos los
     * residentes que residen en ella y el primero que contesta atiende la
     * llamada (a los demas se les cierra el aviso).
     */
    public void inviteApartment(User caller, CallApartmentRequest request) {
        requireStaff(caller);
        String callId = requireText(request.callId(), "Falta el identificador de llamada");
        if (request.apartmentId() == null) {
            throw new CallException("Falta el apartamento al que llamar");
        }
        if (sessions.containsKey(callId)) {
            throw new CallException("La llamada ya existe");
        }
        if (findByParticipant(caller.getEmail()) != null) {
            throw new CallException("Ya tienes una llamada en curso");
        }
        Apartment apartment = apartmentRepository.findByIdAndDeletedFalse(request.apartmentId())
                .orElseThrow(() -> new CallException("El apartamento no existe"));
        List<User> residents = userRepository.findResidentsLivingInApartment(apartment.getId());
        if (residents.isEmpty()) {
            throw new CallException("No hay residentes residiendo en esa vivienda");
        }
        if (request.visitId() != null) {
            linkVisit(request.visitId(), residents);
        }
        if (request.correspondenceId() != null) {
            linkCorrespondence(request.correspondenceId(), residents);
        }

        List<String> targets = residents.stream().map(User::getEmail).toList();
        CallSession session = new CallSession(callId, caller.getEmail(), targets, true);
        sessions.put(callId, session);
        CallEnvelope invite = CallEnvelope.invite(callId, caller);
        targets.forEach(email -> push(email, invite));
        log.info("Llamada {} de {} al apartamento {}: {} residente(s) timbrados",
                callId, caller.getEmail(), apartment.getIdentifier(), targets.size());
    }

    /**
     * Alerta general del edificio (boton de panico): la consergeria o la
     * administracion avisa a TODOS los residentes a la vez. Requiere el codigo de
     * autorizacion para que no se lance por error. El resident recibe un aviso
     * de emergencia y el primero que lo acepta atiende la llamada.
     */
    public void invitePanic(User caller, CallPanicRequest request) {
        requireStaff(caller);
        String callId = requireText(request.callId(), "Falta el identificador de llamada");
        if (!isValidPanicCode(request.code())) {
            throw new CallException("El codigo de la alerta general no es correcto");
        }
        if (sessions.containsKey(callId)) {
            throw new CallException("La llamada ya existe");
        }
        if (findByParticipant(caller.getEmail()) != null) {
            throw new CallException("Ya tienes una llamada en curso");
        }
        List<User> residents = userRepository.findResidentsWithApartment().stream()
                .filter(User::isEnabled)
                .toList();
        if (residents.isEmpty()) {
            throw new CallException("No hay residentes a los que avisar");
        }

        List<String> targets = residents.stream().map(User::getEmail).toList();
        CallSession session = new CallSession(callId, caller.getEmail(), targets, true, true);
        sessions.put(callId, session);
        CallEnvelope alert = CallEnvelope.alert(callId, caller);
        targets.forEach(email -> push(email, alert));
        log.warn("ALERTA GENERAL activada por {}: {} residente(s) avisados",
                caller.getEmail(), targets.size());
        leaveAlertInMailboxes(residents, caller);
    }

    /**
     * Deja constancia de la alerta en el buzon de cada residente: queda
     * registrada aunque el resident tenga la aplicacion cerrada.
     */
    private void leaveAlertInMailboxes(List<User> residents, User caller) {
        try {
            mailService.sendTo(
                    residents.stream().map(User::getId).toList(),
                    "Alerta general del edificio",
                    "Se ha activado una alerta general en el edificio.\n\n"
                            + "Atiende la llamada de porteria o acude al portal.\n\n"
                            + "Activada por: " + display(caller),
                    caller);
        } catch (RuntimeException err) {
            log.warn("No se pudo dejar la alerta general en los buzones: {}", err.getMessage());
        }
    }

    /** Un residente llama a porteria: timbra a toda la consergeria conectada. */
    public void invitePortal(User caller, CallRequest request) {
        requireResident(caller);
        String callId = requireText(request.callId(), "Falta el identificador de llamada");

        if (sessions.containsKey(callId)) {
            throw new CallException("La llamada ya existe");
        }
        if (findByParticipant(caller.getEmail()) != null) {
            throw new CallException("Ya tienes una llamada en curso");
        }
        Set<String> staff = connectedStaffEmails(caller.getEmail());
        if (staff.isEmpty()) {
            throw new CallException("No hay consergeria conectada en este momento");
        }

        CallSession session = new CallSession(callId, caller.getEmail(), staff, true);
        sessions.put(callId, session);
        CallEnvelope invite = CallEnvelope.invite(callId, caller);
        staff.forEach(email -> push(email, invite));
        log.info("Llamada {} de {} ({}) a porteria: {} conserje(s) timbrados",
                callId, caller.getEmail(), PORTAL_LABEL, staff.size());
    }

    /** Alguien atiende: se avisa al llamante y se cierra el aviso al resto. */
    public void accept(User user, CallRequest request) {
        CallSession session = requireSession(request.callId());
        if (!session.isInvited(user.getEmail())) {
            throw new CallException("Solo el destinatario puede aceptar la llamada");
        }
        synchronized (session) {
            if (session.isAnswered()) {
                throw new CallException("La llamada ya ha sido atendida");
            }
            session.answer(user.getEmail());
        }
        push(session.getCallerEmail(), CallEnvelope.accept(session.getCallId(), user));
        session.getInvitedEmails().stream()
                .filter(email -> !email.equalsIgnoreCase(user.getEmail()))
                .forEach(email -> push(email, CallEnvelope.endedWithMessage(
                        session.getCallId(), user.getEmail(),
                        display(user) + (session.isAlert() ? " ha atendido la alerta" : " ha atendido la llamada"))));
        log.info("Llamada {} atendida por {}", session.getCallId(), user.getEmail());
    }

    /** Rechazo: cierra la llamada o, en porteria, descarta a ese conserje. */
    public void reject(User user, CallRequest request) {
        CallSession session = requireSession(request.callId());
        if (!session.isInvited(user.getEmail())) {
            throw new CallException("Solo el destinatario puede rechazar la llamada");
        }
        if (session.isAnswered()) {
            throw new CallException("La llamada ya ha sido atendida");
        }
        // En una llamada a porteria o a una vivienda, si quedan mas companeros
        // timbrando la llamada sigue sonando para ellos.
        if (session.isMultiTarget() && session.getInvitedEmails().size() > 1) {
            session.getInvitedEmails().removeIf(email -> email.equalsIgnoreCase(user.getEmail()));
            log.info("Llamada {}: {} rechaza, sigue timbrando al resto", session.getCallId(), user.getEmail());
            return;
        }
        sessions.remove(session.getCallId());
        push(session.getCallerEmail(), CallEnvelope.reject(session.getCallId(), user));
        log.info("Llamada {} rechazada por {}", session.getCallId(), user.getEmail());
    }

    /** Reenvia una senal WebRTC (oferta, respuesta o candidato ICE) a la contraparte. */
    public void signal(User from, CallSignalRequest request) {
        CallSession session = requireSession(request.callId());
        String kind = requireText(request.kind(), "Falta el tipo de senal").toLowerCase();
        String recipient;
        if (session.isCaller(from.getEmail())) {
            recipient = session.getCalleeEmail();
        } else if (session.hasAnswered(from.getEmail())) {
            recipient = session.getCallerEmail();
        } else {
            recipient = null;
        }
        if (!StringUtils.hasText(recipient)) {
            throw new CallException(session.isAnswered()
                    ? "No participas en esta llamada"
                    : "La llamada aun no ha sido atendida");
        }
        push(recipient, CallEnvelope.signal(session.getCallId(), from, kind, request.payload()));
    }

    /** Cuelga: cierra la llamada y avisa al resto de participantes. */
    public void end(User from, CallRequest request) {
        CallSession session = requireSession(request.callId());
        requireParticipant(session, from);
        sessions.remove(session.getCallId());
        CallEnvelope envelope = CallEnvelope.end(session.getCallId(), from);
        session.participants().stream()
                .filter(email -> !email.equalsIgnoreCase(from.getEmail()))
                .forEach(email -> push(email, envelope));
        log.info("Llamada {} finalizada por {}", session.getCallId(), from.getEmail());
    }

    /** Cierra las llamadas del usuario que se ha desconectado del WebSocket. */
    public void disconnect(String email) {
        if (!StringUtils.hasText(email)) {
            return;
        }
        sessions.values().stream().filter(session -> session.involves(email)).toList().forEach(session -> {
            // Un conserje timbrado que se cae sin contestar no cierra la
            // llamada de porteria: solo deja de ser candidato.
            if (session.isInvited(email) && !session.isCaller(email) && !session.hasAnswered(email)) {
                session.getInvitedEmails().removeIf(invited -> invited.equalsIgnoreCase(email));
                if (!session.isAnswered() && session.getInvitedEmails().isEmpty()) {
                    sessions.remove(session.getCallId());
                    push(session.getCallerEmail(), CallEnvelope.endedWithMessage(
                            session.getCallId(), email, "Nadie ha atendido la llamada"));
                    log.info("Llamada {} cerrada: no queda nadie timbrando", session.getCallId());
                }
                return;
            }
            sessions.remove(session.getCallId());
            CallEnvelope envelope = CallEnvelope.endedByDisconnect(session.getCallId(), email);
            session.participants().stream()
                    .filter(participant -> !participant.equalsIgnoreCase(email))
                    .forEach(participant -> push(participant, envelope));
            log.info("Llamada {} cerrada: {} se ha desconectado", session.getCallId(), email);
        });
    }

    /** Numero de llamadas en curso (diagnostico y pruebas). */
    public int activeCallCount() {
        return sessions.size();
    }

    /** Conserjes y administradores conectados ahora mismo (por email). */
    private Set<String> connectedStaffEmails(String excludeEmail) {
        Set<String> staff = ConcurrentHashMap.newKeySet();
        for (SimpUser user : userRegistry.getUsers()) {
            if (user.getPrincipal() instanceof Authentication authentication
                    && hasStaffAuthority(authentication)
                    && !authentication.getName().equalsIgnoreCase(excludeEmail)) {
                staff.add(authentication.getName());
            }
        }
        return staff;
    }

    private boolean hasStaffAuthority(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> RoleName.CONCIERGE.getAuthority().equals(authority)
                        || RoleName.ADMIN.getAuthority().equals(authority));
    }

    private CallSession requireSession(String callId) {
        String id = requireText(callId, "Falta el identificador de llamada");
        CallSession session = sessions.get(id);
        if (session == null) {
            throw new CallException("La llamada no existe o ya ha terminado");
        }
        return session;
    }

    private CallSession findByParticipant(String email) {
        return sessions.values().stream().filter(session -> session.involves(email)).findFirst().orElse(null);
    }

    /**
     * Enlaza la llamada con la visita que la motiva: al llamar al residente
     * para notificarle la visita, esta queda registrada como avisada.
     */
    private void linkVisit(Long visitId, User callee) {
        linkVisit(visitId, List.of(callee));
    }

    /** Igual que {@link #linkVisit(Long, User)} pero para varios residentes a la vez. */
    private void linkVisit(Long visitId, List<User> residents) {
        try {
            visitService.markNotifiedByCall(visitId, residents);
        } catch (ApiException ex) {
            throw new CallException(ex.getMessage());
        }
    }

    /**
     * Enlaza la llamada con la correspondencia que la motiva: al llamar al
     * residente para notificarle la entrega, esta queda registrada como
     * avisada.
     */
    private void linkCorrespondence(Long correspondenceId, User callee) {
        linkCorrespondence(correspondenceId, List.of(callee));
    }

    /** Igual que {@link #linkCorrespondence(Long, User)} pero para varios residentes a la vez. */
    private void linkCorrespondence(Long correspondenceId, List<User> residents) {
        try {
            correspondenceService.markNotifiedByCall(correspondenceId, residents);
        } catch (ApiException ex) {
            throw new CallException(ex.getMessage());
        }
    }

    private void requireParticipant(CallSession session, User user) {
        if (!session.involves(user.getEmail())) {
            throw new CallException("No participas en esta llamada");
        }
    }

    private void requireStaff(User caller) {
        if (!hasRole(caller, RoleName.CONCIERGE) && !hasRole(caller, RoleName.ADMIN)) {
            throw new CallException("Solo consergeria o administracion pueden llamar a los residentes");
        }
    }

    private void requireResident(User caller) {
        if (!hasRole(caller, RoleName.USER)) {
            throw new CallException("Solo los residentes pueden llamar a porteria");
        }
    }

    private boolean hasRole(User user, RoleName role) {
        return user.getRoles().stream().anyMatch(current -> current.getName() == role);
    }

    private String display(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private String requireText(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new CallException(message);
        }
        return value.trim();
    }

    /** El codigo tecleado por consergeria debe coincidir con el configurado. */
    private boolean isValidPanicCode(String code) {
        return StringUtils.hasText(code) && panicProperties.code().equals(code.trim());
    }

    private void push(String email, CallEnvelope envelope) {
        messagingTemplate.convertAndSendToUser(email, USER_QUEUE, envelope);
    }
}
