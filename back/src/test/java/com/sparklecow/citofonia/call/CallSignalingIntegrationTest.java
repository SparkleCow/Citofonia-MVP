package com.sparklecow.citofonia.call;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

/**
 * Pruebas de la senalizacion de llamadas por STOMP: invitacion, aceptacion,
 * reenvio de SDP/ICE, cuelgue, desconexion y control de permisos.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class CallSignalingIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";
    private static final String QUEUE = "/user/queue/calls";
    private static final long TIMEOUT_SECONDS = 5;

    @LocalServerPort
    private int port;

    @Autowired
    private MockMvc mockMvc;

    @Value("${app.registration.resident-code}")
    private String residentCode;

    @Value("${app.panic.code}")
    private String panicCode;

    @Test
    void callIsRungAcceptedSignalledAndEnded() throws Exception {
        Participants participants = participants();
        StompSession caller = connect(participants.conciergeToken());
        StompSession callee = connect(participants.residentToken());
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(callee, calleeQueue);

            // Consergeria invita al residente.
            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.invite", Map.of("callId", callId, "targetEmail", participants.residentEmail()));

            Map<String, Object> invitation = poll(calleeQueue);
            assertEquals("INVITE", invitation.get("type"));
            assertEquals(callId, invitation.get("callId"));
            assertEquals(participants.conciergeEmail(), invitation.get("from"));
            assertNotNull(invitation.get("fromName"));

            // El residente acepta y el conserje lo sabe.
            callee.send("/app/call.accept", Map.of("callId", callId));
            assertEquals("ACCEPT", poll(callerQueue).get("type"));

            // Intercambio de oferta/respuesta y candidatos ICE.
            caller.send("/app/call.signal",
                    Map.of("callId", callId, "kind", "offer", "payload", Map.of("sdp", "v=0-oferta")));
            Map<String, Object> offer = poll(calleeQueue);
            assertEquals("SIGNAL", offer.get("type"));
            assertEquals("offer", offer.get("kind"));
            assertEquals("v=0-oferta", ((Map<?, ?>) offer.get("payload")).get("sdp"));

            callee.send("/app/call.signal",
                    Map.of("callId", callId, "kind", "answer", "payload", Map.of("sdp", "v=0-respuesta")));
            assertEquals("answer", poll(callerQueue).get("kind"));

            callee.send("/app/call.signal",
                    Map.of("callId", callId, "kind", "ice", "payload", Map.of("candidate", "candidate:1 1 UDP")));
            assertEquals("ice", poll(callerQueue).get("kind"));

            // El conserje cuelga.
            caller.send("/app/call.end", Map.of("callId", callId));
            assertEquals("END", poll(calleeQueue).get("type"));
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    /** Un residente llama a porteria: se timbra a la consergeria y atiende el primero. */
    @Test
    void residentCallsPortalAndFirstStaffAnswers() throws Exception {
        String residentEmail = registerEnabledResident();
        String firstEmail = createConcierge("conserjeporta1");
        String secondEmail = createConcierge("conserjeporta2");

        StompSession resident = connect(login(residentEmail, PASSWORD));
        StompSession first = connect(login(firstEmail, PASSWORD));
        StompSession second = connect(login(secondEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> residentQueue = subscribe(resident);
            BlockingQueue<Map<String, Object>> firstQueue = subscribe(first);
            BlockingQueue<Map<String, Object>> secondQueue = subscribe(second);
            awaitSubscription(resident, residentQueue);
            awaitSubscription(first, firstQueue);
            awaitSubscription(second, secondQueue);

            // El residente llama a porteria: la consergeria conectada recibe el aviso.
            String callId = UUID.randomUUID().toString();
            resident.send("/app/call.portal", Map.of("callId", callId));

            Map<String, Object> firstInvite = poll(firstQueue);
            Map<String, Object> secondInvite = poll(secondQueue);
            assertEquals("INVITE", firstInvite.get("type"));
            assertEquals("INVITE", secondInvite.get("type"));
            assertEquals(callId, firstInvite.get("callId"));
            assertEquals(residentEmail, firstInvite.get("from"));
            assertEquals(residentEmail, secondInvite.get("from"));
            assertNotNull(firstInvite.get("fromName"));

            // El primero que acepta atiende; al otro se le cierra el aviso.
            first.send("/app/call.accept", Map.of("callId", callId));
            assertEquals("ACCEPT", poll(residentQueue).get("type"));

            Map<String, Object> closedElsewhere = poll(secondQueue);
            assertEquals("END", closedElsewhere.get("type"));
            assertEquals(callId, closedElsewhere.get("callId"));
            assertNotNull(closedElsewhere.get("message"));

            // La senalizacion va entre el residente y quien atendio.
            resident.send("/app/call.signal",
                    Map.of("callId", callId, "kind", "offer", "payload", Map.of("sdp", "v=0-oferta")));
            Map<String, Object> offer = poll(firstQueue);
            assertEquals("SIGNAL", offer.get("type"));
            assertEquals("offer", offer.get("kind"));

            first.send("/app/call.signal",
                    Map.of("callId", callId, "kind", "answer", "payload", Map.of("sdp", "v=0-respuesta")));
            assertEquals("answer", poll(residentQueue).get("kind"));

            resident.send("/app/call.end", Map.of("callId", callId));
            assertEquals("END", poll(firstQueue).get("type"));
        } finally {
            resident.disconnect();
            first.disconnect();
            second.disconnect();
        }
    }

    @Test
    void staffCannotCallPortal() throws Exception {
        String conciergeEmail = createConcierge("conserjeportonope");
        StompSession staff = connect(login(conciergeEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> queue = subscribe(staff);
            awaitSubscription(staff, queue);

            staff.send("/app/call.portal", Map.of("callId", UUID.randomUUID().toString()));
            Map<String, Object> error = poll(queue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
        } finally {
            staff.disconnect();
        }
    }

    @Test
    void onlyPrivilegedRolesCanInvite() throws Exception {
        Participants participants = participants();
        StompSession caller = connect(participants.conciergeToken());
        StompSession callee = connect(participants.residentToken());
        try {
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            subscribe(caller);
            awaitSubscription(callee, calleeQueue);

            // Un residente no puede iniciar llamadas: recibe un evento ERROR.
            callee.send("/app/call.invite",
                    Map.of("callId", UUID.randomUUID().toString(), "targetEmail", participants.conciergeEmail()));
            Map<String, Object> error = poll(calleeQueue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    @Test
    void disconnectingCallerEndsTheCall() throws Exception {
        Participants participants = participants();
        StompSession caller = connect(participants.conciergeToken());
        StompSession callee = connect(participants.residentToken());
        try {
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            awaitSubscription(callee, calleeQueue);

            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.invite", Map.of("callId", callId, "targetEmail", participants.residentEmail()));
            assertEquals("INVITE", poll(calleeQueue).get("type"));

            // El conserje cierra la pestana: al residente se le cuelga sola.
            caller.disconnect();
            Map<String, Object> ended = poll(calleeQueue);
            assertEquals("END", ended.get("type"));
            assertEquals(callId, ended.get("callId"));
        } finally {
            callee.disconnect();
        }
    }

    /** Valida que el payload de senalizacion se reenvia tal cual (sin inspeccionarlo). */
    @Test
    void signalFromOutsiderIsRejected() throws Exception {
        Participants participants = participants();
        String intruderEmail = registerEnabledResident();
        StompSession caller = connect(participants.conciergeToken());
        StompSession callee = connect(participants.residentToken());
        StompSession intruder = connect(login(intruderEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> intruderQueue = subscribe(intruder);
            subscribe(callee);
            awaitSubscription(intruder, intruderQueue);

            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.invite", Map.of("callId", callId, "targetEmail", participants.residentEmail()));
            Thread.sleep(400);

            intruder.send("/app/call.signal",
                    Map.of("callId", callId, "kind", "offer", "payload", Map.of("sdp", "espia")));
            Map<String, Object> error = poll(intruderQueue);
            assertEquals("ERROR", error.get("type"));
            assertNull(error.get("callId"));
        } finally {
            caller.disconnect();
            callee.disconnect();
            intruder.disconnect();
        }
    }

    /**
     * Al llamar a un resident para notificarle una visita, la visita queda
     * registrada como avisada por telefono.
     */
    @Test
    void callingResidentToNotifyAVisitMarksTheVisitAsNotified() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        String residentEmail = registerEnabledResident(apartmentId);
        String conciergeEmail = createConcierge("conserjevisita");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        long visitId = registerVisit(conciergeToken, apartmentId, "Marta Ruiz");

        StompSession caller = connect(conciergeToken);
        StompSession callee = connect(login(residentEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            subscribe(caller);
            awaitSubscription(callee, calleeQueue);

            // La consergeria llama al resident para notificarle la visita.
            caller.send("/app/call.invite", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "targetEmail", residentEmail,
                    "visitId", visitId));
            assertEquals("INVITE", poll(calleeQueue).get("type"));

            // La visita queda como notificada y consta el resident avisado.
            String body = mockMvc.perform(get("/api/visits/" + visitId)
                            .header("Authorization", "Bearer " + conciergeToken))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertEquals("NOTIFIED", JsonPath.read(body, "$.status"));
            assertEquals(1, ((List<?>) JsonPath.read(body, "$.notifiedTo")).size());
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    /**
     * No se puede notificar por llamada una visita a un resident que no reside
     * en la vivienda visitada: la llamada se rechaza y la visita sigue pendiente.
     */
    @Test
    void cannotNotifyByCallAResidentOfAnotherApartment() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        long otherApartmentId = createApartment(adminToken);
        String otherEmail = registerEnabledResident(otherApartmentId);
        String conciergeEmail = createConcierge("conserjevisitaerr");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        long visitId = registerVisit(conciergeToken, apartmentId, "Visitante Ajeno");

        StompSession caller = connect(conciergeToken);
        StompSession callee = connect(login(otherEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(callee, calleeQueue);

            caller.send("/app/call.invite", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "targetEmail", otherEmail,
                    "visitId", visitId));

            // Quien llama recibe el ERROR: la llamada ni siquiera se inicia.
            Map<String, Object> error = poll(callerQueue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
            assertTrue(calleeQueue.isEmpty(), "El residente no debe recibir la invitacion");

            // La visita sigue pendiente de aviso.
            String body = mockMvc.perform(get("/api/visits/" + visitId)
                            .header("Authorization", "Bearer " + conciergeToken))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertEquals("PENDING", JsonPath.read(body, "$.status"));
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    /**
     * La consergeria llama a una vivienda: timbra a la vez a todos los
     * residentes que residen en ella y el primero que contesta atiende.
     */
    @Test
    void callingAnApartmentRingsAllItsResidents() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        String firstEmail = registerEnabledResident(apartmentId);
        String secondEmail = registerEnabledResident(apartmentId);
        String conciergeEmail = createConcierge("conserjevivienda");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        long visitId = registerVisit(conciergeToken, apartmentId, "Marta Ruiz");

        StompSession caller = connect(conciergeToken);
        StompSession first = connect(login(firstEmail, PASSWORD));
        StompSession second = connect(login(secondEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> firstQueue = subscribe(first);
            BlockingQueue<Map<String, Object>> secondQueue = subscribe(second);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(first, firstQueue);
            awaitSubscription(second, secondQueue);

            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.apartment", Map.of(
                    "callId", callId,
                    "apartmentId", apartmentId,
                    "visitId", visitId));

            // Timbran a la vez los dos residentes de la vivienda.
            assertEquals("INVITE", poll(firstQueue).get("type"));
            assertEquals("INVITE", poll(secondQueue).get("type"));

            // El primero que acepta atiende; al otro se le cierra el aviso.
            first.send("/app/call.accept", Map.of("callId", callId));
            assertEquals("ACCEPT", poll(callerQueue).get("type"));
            assertEquals("END", poll(secondQueue).get("type"));

            // La visita queda notificada a los dos residentes de la vivienda.
            String body = mockMvc.perform(get("/api/visits/" + visitId)
                            .header("Authorization", "Bearer " + conciergeToken))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertEquals("NOTIFIED", JsonPath.read(body, "$.status"));
            assertEquals(2, ((List<?>) JsonPath.read(body, "$.notifiedTo")).size());
        } finally {
            caller.disconnect();
            first.disconnect();
            second.disconnect();
        }
    }

    /** Una vivienda sin residentes que residan en ella no se puede llamar. */
    @Test
    void cannotCallAnApartmentWithoutResidents() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        String conciergeEmail = createConcierge("conserjevivuevacia");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        StompSession caller = connect(conciergeToken);
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            awaitSubscription(caller, callerQueue);

            caller.send("/app/call.apartment", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "apartmentId", apartmentId));

            Map<String, Object> error = poll(callerQueue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
        } finally {
            caller.disconnect();
        }
    }

    /**
     * Al llamar a un resident para notificarle una correspondencia, esta
     * queda registrada como avisada por telefono.
     */
    @Test
    void callingResidentToNotifyACorrespondenceMarksItAsNotified() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        String residentEmail = registerEnabledResident(apartmentId);
        String conciergeEmail = createConcierge("conserjecorreollamada");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        long correspondenceId = registerCorrespondence(conciergeToken, apartmentId, "Caja de ropa");

        StompSession caller = connect(conciergeToken);
        StompSession callee = connect(login(residentEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            subscribe(caller);
            awaitSubscription(callee, calleeQueue);

            // La consergeria llama al resident para notificarle la entrega.
            caller.send("/app/call.invite", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "targetEmail", residentEmail,
                    "correspondenceId", correspondenceId));
            assertEquals("INVITE", poll(calleeQueue).get("type"));

            // La correspondencia queda como notificada y consta el resident avisado.
            String body = mockMvc.perform(get("/api/correspondences/" + correspondenceId)
                            .header("Authorization", "Bearer " + conciergeToken))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertEquals("NOTIFIED", JsonPath.read(body, "$.status"));
            assertEquals(1, ((List<?>) JsonPath.read(body, "$.notifiedTo")).size());
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    /**
     * No se puede notificar por llamada una correspondencia a un resident que no
     * reside en la vivienda destinataria: la llamada se rechaza.
     */
    @Test
    void cannotNotifyByCallAResidentOfAnotherApartmentAboutACorrespondence() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        long otherApartmentId = createApartment(adminToken);
        String otherEmail = registerEnabledResident(otherApartmentId);
        String conciergeEmail = createConcierge("conserjecorreoerr");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        long correspondenceId = registerCorrespondence(conciergeToken, apartmentId, "Caja ajena");

        StompSession caller = connect(conciergeToken);
        StompSession callee = connect(login(otherEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(callee, calleeQueue);

            caller.send("/app/call.invite", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "targetEmail", otherEmail,
                    "correspondenceId", correspondenceId));

            // Quien llama recibe el ERROR: la llamada ni siquiera se inicia.
            Map<String, Object> error = poll(callerQueue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
            assertTrue(calleeQueue.isEmpty(), "El residente no debe recibir la invitacion");

            // La correspondencia sigue pendiente de aviso.
            String body = mockMvc.perform(get("/api/correspondences/" + correspondenceId)
                            .header("Authorization", "Bearer " + conciergeToken))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertEquals("PENDING", JsonPath.read(body, "$.status"));
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    /**
     * La alerta general exige el codigo de autorizacion: con un codigo
     * incorrecto la consergeria recibe un ERROR y los residentes no se enteran.
     */
    @Test
    void generalAlertRequiresTheAuthorizationCode() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        String residentEmail = registerEnabledResident(apartmentId);
        String conciergeEmail = createConcierge("conserjepanicmal");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        StompSession caller = connect(conciergeToken);
        StompSession resident = connect(login(residentEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> residentQueue = subscribe(resident);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(resident, residentQueue);

            caller.send("/app/call.panic", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "code", "codigo-incorrecto"));

            Map<String, Object> error = poll(callerQueue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
            assertTrue(residentQueue.isEmpty(), "El residente no debe recibir la alerta");
        } finally {
            caller.disconnect();
            resident.disconnect();
        }
    }

    /**
     * La alerta general avisa a TODOS los residentes a la vez y el primero que
     * la acepta atiende la llamada; al resto se les cierra el aviso.
     */
    @Test
    void generalAlertReachesEveryResidentAndTheFirstOneAnswers() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        long apartmentId = createApartment(adminToken);
        String firstEmail = registerEnabledResident(apartmentId);
        String secondEmail = registerEnabledResident(apartmentId);
        String conciergeEmail = createConcierge("conserjepanic");
        String conciergeToken = login(conciergeEmail, PASSWORD);

        StompSession caller = connect(conciergeToken);
        StompSession first = connect(login(firstEmail, PASSWORD));
        StompSession second = connect(login(secondEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> firstQueue = subscribe(first);
            BlockingQueue<Map<String, Object>> secondQueue = subscribe(second);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(first, firstQueue);
            awaitSubscription(second, secondQueue);

            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.panic", Map.of("callId", callId, "code", panicCode));

            // Todos los residentes conectados reciben la alerta.
            Map<String, Object> firstAlert = poll(firstQueue);
            Map<String, Object> secondAlert = poll(secondQueue);
            assertEquals("ALERT", firstAlert.get("type"));
            assertEquals("ALERT", secondAlert.get("type"));
            assertEquals(callId, firstAlert.get("callId"));
            assertEquals(conciergeEmail, firstAlert.get("from"));

            // El primero que acepta atiende; al otro se le cierra el aviso.
            first.send("/app/call.accept", Map.of("callId", callId));
            assertEquals("ACCEPT", poll(callerQueue).get("type"));
            assertEquals("END", poll(secondQueue).get("type"));

            // La alerta queda registrada en el buzon de los residentes avisados.
            assertTrue(awaitMailboxContains(login(firstEmail, PASSWORD), "Alerta general del edificio"),
                    "El buzon debe recoger la alerta");
        } finally {
            caller.disconnect();
            first.disconnect();
            second.disconnect();
        }
    }

    /** Un residente no puede lanzar la alerta general del edificio. */
    @Test
    void residentsCannotLaunchTheGeneralAlert() throws Exception {
        String residentEmail = registerEnabledResident();
        StompSession resident = connect(login(residentEmail, PASSWORD));
        try {
            BlockingQueue<Map<String, Object>> residentQueue = subscribe(resident);
            awaitSubscription(resident, residentQueue);

            resident.send("/app/call.panic", Map.of(
                    "callId", UUID.randomUUID().toString(),
                    "code", panicCode));

            Map<String, Object> error = poll(residentQueue);
            assertEquals("ERROR", error.get("type"));
            assertNotNull(error.get("message"));
        } finally {
            resident.disconnect();
        }
    }

    /**
     * Espera a que el buzon del usuario contenga el asunto indicado: el aviso
     * en el buzon se escribe en segundo plano, tras el aviso en pantalla.
     */
    private boolean awaitMailboxContains(String token, String subject) throws Exception {
        long deadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(10);
        while (System.currentTimeMillis() < deadline) {
            String body = mockMvc.perform(get("/api/mail/messages")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            if (body.contains(subject)) {
                return true;
            }
            Thread.sleep(250);
        }
        return false;
    }

    private Map<String, Object> poll(BlockingQueue<Map<String, Object>> queue) throws InterruptedException {
        Map<String, Object> frame = queue.poll(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertNotNull(frame, "No llego ningun mensaje a la cola de llamadas");
        return frame;
    }

    /**
     * Suscribe la cola personal y espera a que el servidor haya procesado el
     * SUBSCRIBE: se envia un frame posterior y se espera su ERROR, que solo
     * puede llegar despues de registrada la suscripcion.
     */
    private void awaitSubscription(StompSession session, BlockingQueue<Map<String, Object>> queue) throws Exception {
        session.send("/app/call.end", Map.of("callId", "probe-" + UUID.randomUUID()));
        Map<String, Object> probe = poll(queue);
        assertEquals("ERROR", probe.get("type"));
    }

    private BlockingQueue<Map<String, Object>> subscribe(StompSession session) {
        BlockingQueue<Map<String, Object>> queue = new LinkedBlockingQueue<>();
        session.subscribe(QUEUE, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((Map<String, Object>) payload);
            }
        });
        return queue;
    }

    private StompSession connect(String token) throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new JacksonJsonMessageConverter());
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);
        return client.connectAsync(
                        "ws://localhost:" + port + "/ws",
                        new WebSocketHttpHeaders(),
                        connectHeaders,
                        new StompSessionHandlerAdapter() { })
                .get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
    }

    private record Participants(String conciergeEmail, String conciergeToken, String residentEmail, String residentToken) {
    }

    /** Crea una pareja consergeria + residente lista para llamar. */
    private Participants participants() throws Exception {
        String conciergeEmail = createConcierge("conserjellamada");
        String residentEmail = registerEnabledResident();
        return new Participants(
                conciergeEmail, login(conciergeEmail, PASSWORD), residentEmail, login(residentEmail, PASSWORD));
    }

    /** Crea una cuenta de consergeria y devuelve su email. */
    private String createConcierge(String prefix) throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = uniqueEmail(prefix);
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Conserje","lastName":"Llamada","email":"%s","password":"%s",
                                 "roles":["CONCIERGE"]}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isCreated());
        return email;
    }

    private String registerEnabledResident() throws Exception {
        return registerEnabledResident(null);
    }

    /** Registra un residente habilitado, opcionalmente vinculado a una vivienda. */
    private String registerEnabledResident(Long apartmentId) throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = uniqueEmail("resillamada");
        String apartmentField = apartmentId == null ? "" : "\"apartmentId\":" + apartmentId + ",";
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Resi","lastName":"Llamada","email":"%s","phone":"+34600111222",
                                 "password":"%s","registrationCode":"%s",%s
                                 "owner":false,"occupiesApartment":true}
                                """.formatted(email, PASSWORD, residentCode, apartmentField)))
                .andExpect(status().isCreated())
                .andReturn();
        long id = ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
        mockMvc.perform(patch("/api/users/" + id + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        return email;
    }

    /** Crea una vivienda vacia y devuelve su id. */
    private long createApartment(String adminToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/apartments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identifier":"%s","block":"Torre A","floor":1}
                                """.formatted(uniqueIdentifier())))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    /** Anota una visita para una vivienda y devuelve su id. */
    private long registerVisit(String conciergeToken, long apartmentId, String visitorName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/visits")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"visitorName":"%s"}
                                """.formatted(apartmentId, visitorName)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    /** Anota una correspondencia para una vivienda y devuelve su id. */
    private long registerCorrespondence(String conciergeToken, long apartmentId, String description) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/correspondences")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"type":"PAQUETE","description":"%s"}
                                """.formatted(apartmentId, description)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private String uniqueIdentifier() {
        return "L-" + Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(), 36)
                .replace("-", "").toUpperCase();
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private String uniqueEmail(String prefix) {
        return prefix + System.nanoTime() + "@test.local";
    }
}
