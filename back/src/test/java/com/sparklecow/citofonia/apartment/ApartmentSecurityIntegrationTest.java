package com.sparklecow.citofonia.apartment;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * Pruebas de integracion de apartamentos: acceso por roles (ADMIN y SECURITY
 * pueden listar, solo ADMIN gestiona) y vinculacion de residentes.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ApartmentSecurityIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedCannotListApartments() throws Exception {
        mockMvc.perform(get("/api/apartments")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/apartments")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanCreateAndListApartments() throws Exception {
        String adminToken = loginAdmin();
        String identifier = uniqueIdentifier("A");

        long id = createApartment(adminToken, identifier);

        mockMvc.perform(get("/api/apartments/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.identifier").value(identifier))
                .andExpect(jsonPath("$.residentCount").value(0));

        String listBody = mockMvc.perform(get("/api/apartments").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertTrue(listBody.contains("\"" + identifier + "\""),
                "El listado debe incluir el apartamento recien creado");
    }

    @Test
    void securityRoleCanListButClientRoleCannot() throws Exception {
        String adminToken = loginAdmin();
        String identifier = uniqueIdentifier("S");
        createApartment(adminToken, identifier);

        // Un vigilante puede listar apartamentos.
        String securityEmail = uniqueEmail("vigilante");
        createUser(adminToken, securityEmail, "SECURITY");
        String securityToken = login(securityEmail);
        String listBody = mockMvc.perform(get("/api/apartments")
                        .header("Authorization", "Bearer " + securityToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertTrue(listBody.contains("\"" + identifier + "\""),
                "El vigilante debe poder listar los apartamentos");

        // Un cliente (inquilino) no puede listarlos.
        String clientEmail = uniqueEmail("cliente");
        createUser(adminToken, clientEmail, "USER");
        String clientToken = login(clientEmail);
        mockMvc.perform(get("/api/apartments").header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());

        // Tampoco puede crear apartamentos.
        mockMvc.perform(post("/api/apartments")
                        .header("Authorization", "Bearer " + securityToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"X-1\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void residentsCanBeLinkedToAnApartment() throws Exception {
        String adminToken = loginAdmin();
        String identifier = uniqueIdentifier("R");
        long apartmentId = createApartment(adminToken, identifier);

        String clientEmail = uniqueEmail("residente");
        long userId = createUser(adminToken, clientEmail, "USER");

        // El admin vincula el usuario al apartamento.
        mockMvc.perform(patch("/api/users/" + userId + "/apartment")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"apartmentId\":" + apartmentId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apartmentId").value(apartmentId))
                .andExpect(jsonPath("$.apartmentIdentifier").value(identifier));

        // El apartamento lo expone como residente.
        mockMvc.perform(get("/api/apartments/" + apartmentId + "/residents")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(clientEmail));

        mockMvc.perform(get("/api/apartments/" + apartmentId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.residentCount").value(1))
                .andExpect(jsonPath("$.residents[0].email").value(clientEmail));
    }

    @Test
    void onlyAdminCanDeleteApartment() throws Exception {
        String adminToken = loginAdmin();
        long id = createApartment(adminToken, uniqueIdentifier("D"));

        String securityEmail = uniqueEmail("vigilante");
        createUser(adminToken, securityEmail, "SECURITY");
        String securityToken = login(securityEmail);

        mockMvc.perform(delete("/api/apartments/" + id).header("Authorization", "Bearer " + securityToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/apartments/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/apartments/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    private String loginAdmin() throws Exception {
        return login(ADMIN_EMAIL);
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

    private long createApartment(String adminToken, String identifier) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/apartments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identifier":"%s","block":"Torre A","floor":1}
                                """.formatted(identifier)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private long createUser(String adminToken, String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Test","lastName":"User","email":"%s","password":"%s","roles":["%s"]}
                                """.formatted(email, PASSWORD, role)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private String uniqueIdentifier(String prefix) {
        return prefix + "-" + Long.toString(java.util.concurrent.ThreadLocalRandom.current().nextLong(), 36)
                .replace("-", "").toUpperCase();
    }

    private String uniqueEmail(String prefix) {
        return prefix + System.nanoTime() + "@test.local";
    }
}
