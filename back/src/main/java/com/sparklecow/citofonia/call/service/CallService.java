package com.sparklecow.citofonia.call.service;

import com.sparklecow.citofonia.call.CallException;
import com.sparklecow.citofonia.call.CallSession;
import com.sparklecow.citofonia.call.dto.CallEnvelope;
import com.sparklecow.citofonia.call.dto.CallInviteRequest;
import com.sparklecow.citofonia.call.dto.CallRequest;
import com.sparklecow.citofonia.call.dto.CallSignalRequest;
import com.sparklecow.citofonia.call.dto.ResidentDirectoryItem;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
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
 * Gestiona las llamadas de audio entre vigilancia y residentes.
 *
 * <p>El backend solo actua como centralita de senalizacion: valida permisos y
 * reenvia los mensajes ({@link CallEnvelope}) por la cola personal
 * {@code /user/queue/calls} de cada participante. El audio viaja directo
 * entre los navegadores mediante WebRTC (P2P).</p>
 *
 * <p>Hay dos flujos: la vigilancia llama a un residente concreto
 * ({@code /app/call.invite}) y un residente llama a porteria
 * ({@code /app/call.portal}), que timbra a toda la vigilancia conectada; el
 * primero que acepta atiende y al resto se le cierra el aviso.</p>
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
    private final SimpUserRegistry userRegistry;

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

    /** Invita a un residente a una llamada (solo vigilancia/administracion). */
    public void invite(User caller, CallInviteRequest request) {
        requireStaff(caller);
        String callId = requireText(request.callId(), "Falta el identificador de llamada");
        String targetEmail = requireText(request.targetEmail(), "Falta el destinatario").toLowerCase();

        if (caller.getEmail().equalsIgnoreCase(targetEmail)) {
            throw new CallException("No puedes llamarte a ti mismo");
        }
        User callee = userRepository.findByEmailAndDeletedFalse(targetEmail)
                .orElseThrow(() -> new CallException("El residente no existe o esta dado de baja"));
        if (!hasRole(callee, RoleName.USER)) {
            throw new CallException("Solo se puede llamar a residentes");
        }
        if (sessions.containsKey(callId)) {
            throw new CallException("La llamada ya existe");
        }
        if (findByParticipant(caller.getEmail()) != null) {
            throw new CallException("Ya tienes una llamada en curso");
        }
        if (findByParticipant(targetEmail) != null) {
            throw new CallException("El residente esta en otra llamada");
        }

        CallSession session = new CallSession(callId, caller.getEmail(), List.of(targetEmail), false);
        sessions.put(callId, session);
        push(targetEmail, CallEnvelope.invite(callId, caller));
        log.info("Llamada {} iniciada por {} hacia {}", callId, caller.getEmail(), targetEmail);
    }

    /** Un residente llama a porteria: timbra a toda la vigilancia conectada. */
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
            throw new CallException("No hay vigilancia conectada en este momento");
        }

        CallSession session = new CallSession(callId, caller.getEmail(), staff, true);
        sessions.put(callId, session);
        CallEnvelope invite = CallEnvelope.invite(callId, caller);
        staff.forEach(email -> push(email, invite));
        log.info("Llamada {} de {} ({}) a porteria: {} vigilante(s) timbrados",
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
                        session.getCallId(), user.getEmail(), display(user) + " ha atendido la llamada")));
        log.info("Llamada {} atendida por {}", session.getCallId(), user.getEmail());
    }

    /** Rechazo: cierra la llamada o, en porteria, descarta a ese vigilante. */
    public void reject(User user, CallRequest request) {
        CallSession session = requireSession(request.callId());
        if (!session.isInvited(user.getEmail())) {
            throw new CallException("Solo el destinatario puede rechazar la llamada");
        }
        if (session.isAnswered()) {
            throw new CallException("La llamada ya ha sido atendida");
        }
        // En una llamada a porteria, si quedan mas companeros timbrando la
        // llamada sigue sonando para ellos.
        if (session.isPortalCall() && session.getInvitedEmails().size() > 1) {
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
            // Un vigilante timbrado que se cae sin contestar no cierra la
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

    /** Vigilantes y administradores conectados ahora mismo (por email). */
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
                .anyMatch(authority -> RoleName.SECURITY.getAuthority().equals(authority)
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

    private void requireParticipant(CallSession session, User user) {
        if (!session.involves(user.getEmail())) {
            throw new CallException("No participas en esta llamada");
        }
    }

    private void requireStaff(User caller) {
        if (!hasRole(caller, RoleName.SECURITY) && !hasRole(caller, RoleName.ADMIN)) {
            throw new CallException("Solo vigilancia o administracion pueden llamar a los residentes");
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

    private void push(String email, CallEnvelope envelope) {
        messagingTemplate.convertAndSendToUser(email, USER_QUEUE, envelope);
    }
}
