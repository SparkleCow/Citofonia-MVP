package com.sparklecow.citofonia.visit;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Pruebas de integracion de las visitas al portal:
 * registro por consergeria, aviso solo a los residentes que residen en la
 * vivienda, historial por vivienda y permisos.
 */
@SpringBootTest
@AutoConfigureMockMvc
class VisitIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void conciergeRegistersVisitAndNotifiesOnlyResidentsLivingInTheApartment() throws Exception {
        String adminToken = login(ADMIN_EMAIL);
        String conciergeEmail = uniqueEmail("conserjevisita");
        createUser(adminToken, conciergeEmail, "CONCIERGE");
        String conciergeToken = login(conciergeEmail);

        long apartmentId = createApartment(adminToken);

        // Residente que reside en la vivienda (inquilino).
        String tenantEmail = uniqueEmail("inquilino");
        long tenantId = createUser(adminToken, tenantEmail, "USER");
        linkApartment(adminToken, tenantId, apartmentId);

        // Propietario ausente: vinculado a la vivienda pero NO reside en ella.
        String absentOwnerEmail = uniqueEmail("propietarioausente");
        long absentOwnerId = createUser(adminToken, absentOwnerEmail, "USER");
        linkApartment(adminToken, absentOwnerId, apartmentId);
        mockMvc.perform(put("/api/users/" + absentOwnerId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"owner":true,"occupiesApartment":false}
                                """))
                .andExpect(status().isOk());

        // Residente de otra vivienda: no puede recibir el aviso de esta visita.
        long otherApartmentId = createApartment(adminToken);
        String otherEmail = uniqueEmail("otroresidente");
        long otherId = createUser(adminToken, otherEmail, "USER");
        linkApartment(adminToken, otherId, otherApartmentId);

        // La consergeria anota la visita.
        MvcResult created = mockMvc.perform(post("/api/visits")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"visitorName":"Marta Ruiz","visitorDocument":"12345678A",
                                 "visitorPhone":"+34600111222","visitorCompany":"Fontaneria Ruiz",
                                 "notes":"Revision de la caldera"}
                                """.formatted(apartmentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.visitorName").value("Marta Ruiz"))
                .andReturn();
        long visitId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        // Solo son elegibles los residentes que residen en la vivienda visitada.
        mockMvc.perform(get("/api/visits/recipients?apartmentId=" + apartmentId)
                        .header("Authorization", "Bearer " + conciergeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].email").value(tenantEmail));

        // No se puede avisar a un residente de otra vivienda.
        mockMvc.perform(post("/api/visits/" + visitId + "/notify")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"residentIds\":[%d]}".formatted(otherId)))
                .andExpect(status().isBadRequest());

        // El aviso llega al buzon del residente que reside en la vivienda.
        mockMvc.perform(post("/api/visits/" + visitId + "/notify")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"residentIds\":[%d]}".formatted(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOTIFIED"))
                .andExpect(jsonPath("$.notifiedTo", hasSize(1)));

        String tenantToken = login(tenantEmail);
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + tenantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Visita en tu vivienda: Marta Ruiz"));

        // El propietario ausente no recibe el aviso ni consulta el historial.
        String absentOwnerToken = login(absentOwnerEmail);
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + absentOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/visits/mine").header("Authorization", "Bearer " + absentOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        // El residente de otra vivienda tampoco.
        String otherToken = login(otherEmail);
        mockMvc.perform(get("/api/visits/mine").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        // El que reside en la vivienda si ve el historial de visitas.
        mockMvc.perform(get("/api/visits/mine").header("Authorization", "Bearer " + tenantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].visitorName").value("Marta Ruiz"));

        // La consergeria cambia el estado: autorizada y despues cerrada.
        mockMvc.perform(patch("/api/visits/" + visitId + "/status")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ADMITTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ADMITTED"));
        mockMvc.perform(patch("/api/visits/" + visitId + "/status")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.exitAt").exists());
    }

    @Test
    void residentsCannotRegisterVisitsNorListAllVisits() throws Exception {
        String adminToken = login(ADMIN_EMAIL);
        long apartmentId = createApartment(adminToken);

        String residentEmail = uniqueEmail("residentevisita");
        long residentId = createUser(adminToken, residentEmail, "USER");
        linkApartment(adminToken, residentId, apartmentId);
        String residentToken = login(residentEmail);

        // Un residente no puede anotar visitas.
        mockMvc.perform(post("/api/visits")
                        .header("Authorization", "Bearer " + residentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"visitorName":"Intruso"}
                                """.formatted(apartmentId)))
                .andExpect(status().isForbidden());

        // Ni listar las visitas del edificio.
        mockMvc.perform(get("/api/visits").header("Authorization", "Bearer " + residentToken))
                .andExpect(status().isForbidden());

        // Ni ver las visitas de otra vivienda.
        long otherApartmentId = createApartment(adminToken);
        String otherEmail = uniqueEmail("otrovecino");
        long otherId = createUser(adminToken, otherEmail, "USER");
        linkApartment(adminToken, otherId, otherApartmentId);

        String conciergeEmail = uniqueEmail("conserjevisita2");
        createUser(adminToken, conciergeEmail, "CONCIERGE");
        String conciergeToken = login(conciergeEmail);

        MvcResult created = mockMvc.perform(post("/api/visits")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"visitorName":"Visitante Ajeno"}
                                """.formatted(otherApartmentId)))
                .andExpect(status().isCreated())
                .andReturn();
        long visitId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(get("/api/visits/" + visitId).header("Authorization", "Bearer " + residentToken))
                .andExpect(status().isForbidden());
    }

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

    private long createUser(String adminToken, String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Test","lastName":"Visita","email":"%s","password":"%s","roles":["%s"]}
                                """.formatted(email, PASSWORD, role)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void linkApartment(String adminToken, long userId, long apartmentId) throws Exception {
        mockMvc.perform(patch("/api/users/" + userId + "/apartment")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"apartmentId\":" + apartmentId + "}"))
                .andExpect(status().isOk());
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

    private String uniqueIdentifier() {
        return "V-" + Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(), 36)
                .replace("-", "").toUpperCase();
    }

    private String uniqueEmail(String prefix) {
        return prefix + System.nanoTime() + "@test.local";
    }
}
