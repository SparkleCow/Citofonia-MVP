package com.sparklecow.citofonia.call;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
 * Pruebas del directorio de llamadas: solo consergeria/administracion pueden
 * consultarlo y solo aparecen residentes con vivienda vinculada.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CallDirectoryIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Value("${app.registration.resident-code}")
    private String residentCode;

    @Test
    void conciergeAndAdminSeeResidentsWithApartment() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String conciergeToken = createConciergeAndLogin(adminToken);
        long apartmentId = firstApartmentId();

        String residentEmail = uniqueEmail("directorio");
        long residentId = registerResident(residentEmail, apartmentId);
        mockMvc.perform(patch("/api/users/" + residentId + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/calls/residents").header("Authorization", "Bearer " + conciergeToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(residentEmail)));

        mockMvc.perform(get("/api/calls/residents").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(residentEmail)));
    }

    @Test
    void residentsWithoutApartmentAreNotListed() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String conciergeToken = createConciergeAndLogin(adminToken);

        String residentEmail = uniqueEmail("sinvivienda");
        registerResident(residentEmail, null);

        mockMvc.perform(get("/api/calls/residents").header("Authorization", "Bearer " + conciergeToken))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString(residentEmail))));
    }

    @Test
    void residentCannotListDirectory() throws Exception {
        String adminToken = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        String residentEmail = uniqueEmail("nodirectorio");
        long residentId = registerResident(residentEmail, firstApartmentId());
        mockMvc.perform(patch("/api/users/" + residentId + "/enable")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        String residentToken = login(residentEmail, PASSWORD);

        mockMvc.perform(get("/api/calls/residents").header("Authorization", "Bearer " + residentToken))
                .andExpect(status().isForbidden());
    }

    private String createConciergeAndLogin(String adminToken) throws Exception {
        String email = uniqueEmail("conserjedir");
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Conserje","lastName":"Directorio","email":"%s","password":"%s",
                                 "roles":["CONCIERGE"]}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isCreated());
        return login(email, PASSWORD);
    }

    private long firstApartmentId() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/apartments/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(org.hamcrest.Matchers.greaterThan(0))))
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$[0].id")).longValue();
    }

    private long registerResident(String email, Long apartmentId) throws Exception {
        String apartment = apartmentId == null ? "" : ",\"apartmentId\":" + apartmentId;
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Resi","lastName":"Directorio","email":"%s","phone":"+34600111222",
                                 "password":"%s","registrationCode":"%s"%s}
                                """.formatted(email, PASSWORD, residentCode, apartment)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
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
