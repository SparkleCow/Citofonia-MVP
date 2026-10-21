package com.sparklecow.citofonia.correspondence;

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
 * Pruebas de integracion de la correspondencia del portal: registro por
 * consergeria, destinatario que reside en la vivienda, aviso solo a los
 * residentes de la vivienda, entrega en porteria y permisos.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CorrespondenceIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void conciergeRegistersCorrespondenceAndNotifiesOnlyResidentsLivingInTheApartment() throws Exception {
        String adminToken = login(ADMIN_EMAIL);
        String conciergeEmail = uniqueEmail("conserjecorreo");
        createUser(adminToken, conciergeEmail, "CONCIERGE");
        String conciergeToken = login(conciergeEmail);

        long apartmentId = createApartment(adminToken);

        // Residente que reside en la vivienda (inquilino).
        String tenantEmail = uniqueEmail("inquilinocorreo");
        long tenantId = createUser(adminToken, tenantEmail, "USER");
        linkApartment(adminToken, tenantId, apartmentId);

        // Propietario ausente: vinculado a la vivienda pero NO reside en ella.
        String absentOwnerEmail = uniqueEmail("propietariocorreo");
        long absentOwnerId = createUser(adminToken, absentOwnerEmail, "USER");
        linkApartment(adminToken, absentOwnerId, apartmentId);
        mockMvc.perform(put("/api/users/" + absentOwnerId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"owner":true,"occupiesApartment":false}
                                """))
                .andExpect(status().isOk());

        // Residente de otra vivienda: no puede ser destinatario ni recibir el aviso.
        long otherApartmentId = createApartment(adminToken);
        String otherEmail = uniqueEmail("otrocorreo");
        long otherId = createUser(adminToken, otherEmail, "USER");
        linkApartment(adminToken, otherId, otherApartmentId);

        // La consergeria anota la correspondencia para el inquilino de la vivienda.
        MvcResult created = mockMvc.perform(post("/api/correspondences")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"type":"PAQUETE","description":"Caja pequena de ropa",
                                 "carrier":"SEUR","trackingNumber":"1Z999AA1","recipientId":%d,
                                 "delivery":"PORTERIA"}
                                """.formatted(apartmentId, tenantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.type").value("PAQUETE"))
                .andExpect(jsonPath("$.delivery").value("PORTERIA"))
                .andExpect(jsonPath("$.recipientId").value(tenantId))
                .andExpect(jsonPath("$.apartmentIdentifier").exists())
                .andReturn();
        long correspondenceId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id"))
                .longValue();

        // Solo son elegibles los residentes que residen en la vivienda destinataria.
        mockMvc.perform(get("/api/correspondences/recipients?apartmentId=" + apartmentId)
                        .header("Authorization", "Bearer " + conciergeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].email").value(tenantEmail));

        // No se puede elegir como destinatario a un residente de otra vivienda.
        mockMvc.perform(post("/api/correspondences")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"type":"CARTA","recipientId":%d}
                                """.formatted(apartmentId, otherId)))
                .andExpect(status().isBadRequest());

        // No se puede avisar a un residente de otra vivienda.
        mockMvc.perform(post("/api/correspondences/" + correspondenceId + "/notify")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"residentIds\":[%d]}".formatted(otherId)))
                .andExpect(status().isBadRequest());

        // El aviso llega al buzon del residente que reside en la vivienda.
        mockMvc.perform(post("/api/correspondences/" + correspondenceId + "/notify")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"residentIds\":[%d]}".formatted(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOTIFIED"))
                .andExpect(jsonPath("$.notifiedTo", hasSize(1)));

        String tenantToken = login(tenantEmail);
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + tenantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Correspondencia para tu vivienda: Caja pequena de ropa"));

        // El propietario ausente no recibe el aviso ni consulta el historial.
        String absentOwnerToken = login(absentOwnerEmail);
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + absentOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/correspondences/mine").header("Authorization", "Bearer " + absentOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        // El residente de otra vivienda tampoco.
        String otherToken = login(otherEmail);
        mockMvc.perform(get("/api/correspondences/mine").header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        // El que reside en la vivienda si ve la correspondencia de su vivienda.
        mockMvc.perform(get("/api/correspondences/mine").header("Authorization", "Bearer " + tenantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].description").value("Caja pequena de ropa"));

        // Queda en porteria: se avisa por buzon para que la recoja.
        mockMvc.perform(post("/api/correspondences/" + correspondenceId + "/hold")
                        .header("Authorization", "Bearer " + conciergeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.delivery").value("PORTERIA"))
                .andExpect(jsonPath("$.status").value("NOTIFIED"));
        mockMvc.perform(get("/api/mail/messages").header("Authorization", "Bearer " + tenantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Correspondencia en porteria: Caja pequena de ropa"));

        // La consergeria confirma la entrega: la vivienda ya no la espera.
        mockMvc.perform(patch("/api/correspondences/" + correspondenceId + "/status")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.collectedAt").exists());
    }

    @Test
    void residentsCannotRegisterCorrespondenceNorListAllOfThem() throws Exception {
        String adminToken = login(ADMIN_EMAIL);
        long apartmentId = createApartment(adminToken);

        String residentEmail = uniqueEmail("residentecorreo");
        long residentId = createUser(adminToken, residentEmail, "USER");
        linkApartment(adminToken, residentId, apartmentId);
        String residentToken = login(residentEmail);

        // Un residente no puede anotar correspondencia.
        mockMvc.perform(post("/api/correspondences")
                        .header("Authorization", "Bearer " + residentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"type":"PAQUETE"}
                                """.formatted(apartmentId)))
                .andExpect(status().isForbidden());

        // Ni listar la correspondencia del edificio.
        mockMvc.perform(get("/api/correspondences").header("Authorization", "Bearer " + residentToken))
                .andExpect(status().isForbidden());

        // Ni ver la correspondencia de otra vivienda.
        long otherApartmentId = createApartment(adminToken);
        String otherEmail = uniqueEmail("otrovecinocorreo");
        long otherId = createUser(adminToken, otherEmail, "USER");
        linkApartment(adminToken, otherId, otherApartmentId);

        String conciergeEmail = uniqueEmail("conserjecorreo2");
        createUser(adminToken, conciergeEmail, "CONCIERGE");
        String conciergeToken = login(conciergeEmail);

        MvcResult created = mockMvc.perform(post("/api/correspondences")
                        .header("Authorization", "Bearer " + conciergeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"apartmentId":%d,"type":"CARTA","description":"Carta ajena"}
                                """.formatted(otherApartmentId)))
                .andExpect(status().isCreated())
                .andReturn();
        long correspondenceId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id"))
                .longValue();

        mockMvc.perform(get("/api/correspondences/" + correspondenceId)
                        .header("Authorization", "Bearer " + residentToken))
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
                                {"firstName":"Test","lastName":"Correo","email":"%s","password":"%s","roles":["%s"]}
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
        return "C-" + Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(), 36)
                .replace("-", "").toUpperCase();
    }

    private String uniqueEmail(String prefix) {
        return prefix + System.nanoTime() + "@test.local";
    }
}
