package com.sparklecow.citofonia.mail;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Pruebas de integracion del sistema de mensajeria (buzon):
 * envio de administracion, reparto por audiencias, lectura y permisos.
 */
@SpringBootTest
@AutoConfigureMockMvc
class MailIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Value("${app.registration.resident-code}")
    private String residentCode;

    @Test
    void adminSendsBroadcastAndResidentReceivesItInMailbox() throws Exception {
        String adminToken = login(ADMIN_EMAIL);
        String email = uniqueEmail("buzon");

        // Se crea un residente, se habilita y obtiene su token.
        long userId = registerResident(email);
        mockMvc.perform(patch("/api/users/" + userId + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        String userToken = login(email);

        // Buzon vacio al principio.
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/mail/stats").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));

        // El admin envia un comunicado a todos.
        mockMvc.perform(post("/api/admin/mail")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Corte de agua","body":"El martes de 9 a 13.",
                                 "audience":"ALL"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recipientCount").value(org.hamcrest.Matchers.greaterThan(0)));

        // El residente lo recibe en su buzon, sin leer.
        MvcResult inbox = mockMvc.perform(get("/api/mail/messages")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].subject").value("Corte de agua"))
                .andExpect(jsonPath("$[0].read").value(false))
                .andReturn();
        long itemId = ((Number) JsonPath.read(inbox.getResponse().getContentAsString(), "$[0].id"))
                .longValue();

        mockMvc.perform(get("/api/mail/stats").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.unread").value(1));

        // Marcar como leido baja el contador de no leidos.
        mockMvc.perform(patch("/api/mail/messages/" + itemId + "/read")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        mockMvc.perform(get("/api/mail/stats").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unread").value(0));
    }

    @Test
    void conciergeRoleCannotSendMessagesAndCannotReadOthersMailbox() throws Exception {
        String adminToken = login(ADMIN_EMAIL);

        // Cuenta de consergeria creada por el admin.
        String conciergeEmail = uniqueEmail("conserjebuzon");
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Conserje","lastName":"Buzon","email":"%s","password":"%s",
                                 "roles":["CONCIERGE"]}
                                """.formatted(conciergeEmail, PASSWORD)))
                .andExpect(status().isCreated());
        String conciergeToken = login(conciergeEmail);

        // La consergeria no puede enviar mensajes (solo ADMIN).
        mockMvc.perform(post("/api/admin/mail")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Hola","body":"No deberia poder","audience":"ALL"}
                                """))
                .andExpect(status().isForbidden());

        // Audiencia CUSTOM sin destinatarios -> 400.
        mockMvc.perform(post("/api/admin/mail")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Hola","body":"Sin destinatarios","audience":"CUSTOM",
                                 "recipientIds":[]}
                                """))
                .andExpect(status().isBadRequest());

        // Un residente no puede leer el buzon ajeno: su propio buzon esta vacio.
        String otherEmail = uniqueEmail("otrobuzon");
        long otherId = registerResident(otherEmail);
        mockMvc.perform(patch("/api/users/" + otherId + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        String otherToken = login(otherEmail);
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Y no puede marcar como leido un mensaje que no esta en su buzon.
        mockMvc.perform(patch("/api/mail/messages/1/read")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void targetedAudienceOnlyReachesChosenRoles() throws Exception {
        String adminToken = login(ADMIN_EMAIL);

        String conciergeEmail = uniqueEmail("conserjeseg");
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Conserje","lastName":"Edificio","email":"%s","password":"%s",
                                 "roles":["CONCIERGE"]}
                                """.formatted(conciergeEmail, PASSWORD)))
                .andExpect(status().isCreated());
        String conciergeToken = login(conciergeEmail);

        // Residente habilitado para comprobar que NO recibe los avisos de consergeria.
        String residentEmail = uniqueEmail("nores");
        long residentId = registerResident(residentEmail);
        mockMvc.perform(patch("/api/users/" + residentId + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        String residentToken = login(residentEmail);

        // El admin envia solo a consergeria.
        mockMvc.perform(post("/api/admin/mail")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"Reunion de consergeria","body":"Mañana 8:00.",
                                 "audience":"CONCIERGE"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + conciergeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Reunion de consergeria"));
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + residentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    private long registerResident(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Buzon","lastName":"Test","email":"%s","phone":"+34600111222",
                                 "password":"%s","registrationCode":"%s"}
                                """.formatted(email, PASSWORD, residentCode)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private String login(String email) throws Exception {
        String password = ADMIN_EMAIL.equals(email) ? ADMIN_PASSWORD : PASSWORD;
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
