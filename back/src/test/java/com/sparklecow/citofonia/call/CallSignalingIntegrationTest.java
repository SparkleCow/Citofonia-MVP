package com.sparklecow.citofonia.call;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.lang.reflect.Type;
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

    @Test
    void callIsRungAcceptedSignalledAndEnded() throws Exception {
        Participants participants = participants();
        StompSession caller = connect(participants.securityToken());
        StompSession callee = connect(participants.residentToken());
        try {
            BlockingQueue<Map<String, Object>> callerQueue = subscribe(caller);
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            awaitSubscription(caller, callerQueue);
            awaitSubscription(callee, calleeQueue);

            // Vigilancia invita al residente.
            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.invite", Map.of("callId", callId, "targetEmail", participants.residentEmail()));

            Map<String, Object> invitation = poll(calleeQueue);
            assertEquals("INVITE", invitation.get("type"));
            assertEquals(callId, invitation.get("callId"));
            assertEquals(participants.securityEmail(), invitation.get("from"));
            assertNotNull(invitation.get("fromName"));

            // El residente acepta y el vigilante lo sabe.
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

            // El vigilante cuelga.
            caller.send("/app/call.end", Map.of("callId", callId));
            assertEquals("END", poll(calleeQueue).get("type"));
        } finally {
            caller.disconnect();
            callee.disconnect();
        }
    }

    /** Un residente llama a porteria: se timbra a la vigilancia y atiende el primero. */
    @Test
    void residentCallsPortalAndFirstStaffAnswers() throws Exception {
        String residentEmail = registerEnabledResident();
        String firstEmail = createSecurity("vigiporta1");
        String secondEmail = createSecurity("vigiporta2");

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

            // El residente llama a porteria: la vigilancia conectada recibe el aviso.
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
        String securityEmail = createSecurity("vigiportonope");
        StompSession staff = connect(login(securityEmail, PASSWORD));
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
        StompSession caller = connect(participants.securityToken());
        StompSession callee = connect(participants.residentToken());
        try {
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            subscribe(caller);
            awaitSubscription(callee, calleeQueue);

            // Un residente no puede iniciar llamadas: recibe un evento ERROR.
            callee.send("/app/call.invite",
                    Map.of("callId", UUID.randomUUID().toString(), "targetEmail", participants.securityEmail()));
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
        StompSession caller = connect(participants.securityToken());
        StompSession callee = connect(participants.residentToken());
        try {
            BlockingQueue<Map<String, Object>> calleeQueue = subscribe(callee);
            awaitSubscription(callee, calleeQueue);

            String callId = UUID.randomUUID().toString();
            caller.send("/app/call.invite", Map.of("callId", callId, "targetEmail", participants.residentEmail()));
            assertEquals("INVITE", poll(calleeQueue).get("type"));

            // El vigilante cierra la pestana: al residente se le cuelga sola.
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
        StompSession caller = connect(participants.securityToken());
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

    private record Participants(String securityEmail, String securityToken, String residentEmail, String residentToken) {
    }

    /** Crea una pareja vigilancia + residente lista para llamar. */
    private Participants participants() throws Exception {
        String securityEmail = createSecurity("vigillamada");
        String residentEmail = registerEnabledResident();
        return new Participants(
                securityEmail, login(securityEmail, PASSWORD), residentEmail, login(residentEmail, PASSWORD));
    }

    /** Crea una cuenta de vigilancia y devuelve su email. */
    private String createSecurity(String prefix) throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = uniqueEmail(prefix);
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Vigi","lastName":"Llamada","email":"%s","password":"%s",
                                 "roles":["SECURITY"]}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isCreated());
        return email;
    }

    private String registerEnabledResident() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String email = uniqueEmail("resillamada");
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Resi","lastName":"Llamada","email":"%s","phone":"+34600111222",
                                 "password":"%s","registrationCode":"%s"}
                                """.formatted(email, PASSWORD, residentCode)))
                .andExpect(status().isCreated())
                .andReturn();
        long id = ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
        mockMvc.perform(patch("/api/users/" + id + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        return email;
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
