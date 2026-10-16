package com.sparklecow.citofonia.user;

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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Pruebas de integracion del flujo de seguridad completo:
 * autenticacion JWT, generacion de codigos exclusiva de administradores,
 * autoregistro de clientes y vigilantes, y habilitacion por parte del admin.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityFlowIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/registration-codes/client")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminGeneratesClientCodeAndUserMustBeEnabled() throws Exception {
        String adminToken = loginAdmin();
        String email = uniqueEmail("cliente");

        String code = generateCode(adminToken, "/api/admin/registration-codes/client", "USER");

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email, code)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.roles[0]").value("USER"))
                .andReturn();
        long id = ((Number) JsonPath.read(registerResult.getResponse().getContentAsString(), "$.id")).longValue();

        // Cuenta deshabilitada: no puede iniciar sesion.
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody(email)))
                .andExpect(status().isForbidden());

        // El admin la habilita y ahora si puede iniciar sesion con su rol.
        mockMvc.perform(patch("/api/users/" + id + "/enable").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("USER"));
    }

    @Test
    void securityRegistrationAssignsSecurityRoleAndRejectsWrongCode() throws Exception {
        String adminToken = loginAdmin();

        String securityCode = generateCode(adminToken, "/api/admin/registration-codes/security", "SECURITY");
        String securityEmail = uniqueEmail("vigilante");
        mockMvc.perform(post("/api/auth/register/security")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(securityEmail, securityCode)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.roles[0]").value("SECURITY"));

        // Un codigo de cliente no sirve para el registro de vigilante.
        String clientCode = generateCode(adminToken, "/api/admin/registration-codes/client", "USER");
        mockMvc.perform(post("/api/auth/register/security")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(uniqueEmail("cruzado"), clientCode)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCannotGenerateAdminCode() throws Exception {
        String adminToken = loginAdmin();
        mockMvc.perform(post("/api/admin/registration-codes")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void regularUserCannotAccessAdminEndpoints() throws Exception {
        String adminToken = loginAdmin();
        String email = uniqueEmail("user");

        String code = generateCode(adminToken, "/api/admin/registration-codes/client", "USER");
        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email, code)))
                .andExpect(status().isCreated())
                .andReturn();
        long id = ((Number) JsonPath.read(registerResult.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(patch("/api/users/" + id + "/enable").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email)))
                .andExpect(status().isOk())
                .andReturn();
        String userToken = JsonPath.read(loginResult.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/registration-codes/client").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    private String loginAdmin() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(ADMIN_EMAIL)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private String generateCode(String adminToken, String path, String expectedRole) throws Exception {
        MvcResult result = mockMvc.perform(post(path).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value(expectedRole))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.code");
    }

    private String registerBody(String email, String code) {
        return """
                {"firstName":"Test","lastName":"User","email":"%s","password":"%s","registrationCode":"%s"}
                """.formatted(email, PASSWORD, code);
    }

    private String loginBody(String email) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, ADMIN_EMAIL.equals(email) ? ADMIN_PASSWORD : PASSWORD);
    }

    private String uniqueEmail(String prefix) {
        return prefix + System.nanoTime() + "@test.local";
    }
}
