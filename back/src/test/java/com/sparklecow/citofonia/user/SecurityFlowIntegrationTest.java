package com.sparklecow.citofonia.user;

import static org.hamcrest.Matchers.hasItem;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Pruebas de integracion del flujo de seguridad completo:
 * autenticacion JWT, autoregistro de residentes con el codigo fijo del
 * edificio y habilitacion por parte del admin.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityFlowIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@citofonia.local";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String PASSWORD = "S3gura!123";

    @Autowired
    private MockMvc mockMvc;

    @Value("${app.registration.resident-code}")
    private String residentCode;

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/pending")).andExpect(status().isUnauthorized());
    }

    @Test
    void residentRegistersWithFixedCodeAndMustBeEnabled() throws Exception {
        String adminToken = loginAdmin();
        String email = uniqueEmail("residente");

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email, residentCode)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.roles[0]").value("USER"))
                .andExpect(jsonPath("$.phone").value("+34600111222"))
                .andReturn();
        long id = ((Number) JsonPath.read(registerResult.getResponse().getContentAsString(), "$.id")).longValue();

        // Aparece en el listado de pendientes.
        mockMvc.perform(get("/api/users/pending").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem(email)));

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
    void residentRegistersWithApartmentAndHousingCondition() throws Exception {
        String adminToken = loginAdmin();
        long apartmentId = firstApartmentId(adminToken);
        String ownerEmail = uniqueEmail("dueno");

        // Propietario ausente: se registra con su vivienda pero no reside en ella.
        MvcResult ownerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Dueno","lastName":"Ausente","email":"%s","phone":"+34600111222",
                                 "password":"%s","registrationCode":"%s","apartmentId":%d,
                                 "owner":true,"occupiesApartment":false}
                                """.formatted(ownerEmail, PASSWORD, residentCode, apartmentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apartmentId").value(apartmentId))
                .andExpect(jsonPath("$.apartmentIdentifier").isNotEmpty())
                .andExpect(jsonPath("$.owner").value(true))
                .andExpect(jsonPath("$.occupiesApartment").value(false))
                .andReturn();
        long ownerId = ((Number) JsonPath.read(ownerResult.getResponse().getContentAsString(), "$.id")).longValue();

        // Inquilino que si reside en la vivienda.
        String tenantEmail = uniqueEmail("inquilino");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Inqui","lastName":"Lino","email":"%s","phone":"+34600111222",
                                 "password":"%s","registrationCode":"%s","apartmentId":%d,"owner":false}
                                """.formatted(tenantEmail, PASSWORD, residentCode, apartmentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apartmentId").value(apartmentId))
                .andExpect(jsonPath("$.owner").value(false))
                .andExpect(jsonPath("$.occupiesApartment").value(true));

        // El propietario aparece en pendientes con su vivienda y condicion.
        mockMvc.perform(get("/api/users/pending").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem(ownerEmail)));
        mockMvc.perform(get("/api/users/" + ownerId).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner").value(true))
                .andExpect(jsonPath("$.occupiesApartment").value(false))
                .andExpect(jsonPath("$.apartmentIdentifier").isNotEmpty());

        // Habilitado: sus notificaciones son solo generales.
        mockMvc.perform(patch("/api/users/" + ownerId + "/enable").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        String ownerToken = login(ownerEmail);
        mockMvc.perform(get("/api/notifications/preferences").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.general").value(true))
                .andExpect(jsonPath("$.visits").value(false))
                .andExpect(jsonPath("$.deliveries").value(false))
                .andExpect(jsonPath("$.profile").value("OWNER_ABSENT"))
                .andExpect(jsonPath("$.apartmentIdentifier").isNotEmpty());

        // El inquilino habilitado recibe generales, visitas y domicilios.
        long tenantId = findPendingId(adminToken, tenantEmail);
        mockMvc.perform(patch("/api/users/" + tenantId + "/enable").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        String tenantToken = login(tenantEmail);
        mockMvc.perform(get("/api/notifications/preferences").header("Authorization", "Bearer " + tenantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.general").value(true))
                .andExpect(jsonPath("$.visits").value(true))
                .andExpect(jsonPath("$.deliveries").value(true))
                .andExpect(jsonPath("$.profile").value("RESIDENT"));
    }

    @Test
    void apartmentOptionsArePublicAndOnlyResidentsCanHaveApartment() throws Exception {
        String adminToken = loginAdmin();

        // Listado publico para el formulario de registro (sin token).
        MvcResult optionsResult = mockMvc.perform(get("/api/apartments/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].identifier").isNotEmpty())
                .andReturn();
        long apartmentId = ((Number) JsonPath.read(
                optionsResult.getResponse().getContentAsString(), "$[0].id")).longValue();

        // Vigilancia no puede llevar apartamento vinculado.
        MvcResult securityResult = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Vigi","lastName":"Lante","email":"%s","password":"%s",
                                 "roles":["SECURITY"],"apartmentId":%d}
                                """.formatted(uniqueEmail("vigiconapto"), PASSWORD, apartmentId)))
                .andExpect(status().is4xxClientError())
                .andReturn();
        org.assertj.core.api.Assertions.assertThat(securityResult.getResponse().getContentAsString())
                .contains("residentes");
    }

    @Test
    void wrongRegistrationCodeIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(uniqueEmail("malcodigo"), "CODIGO-INVALIDO")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCreatesSecurityUsersDirectly() throws Exception {
        String adminToken = loginAdmin();

        MvcResult securityResult = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createUserBody("Vigilante", "Seguridad",
                                uniqueEmail("vigilancia"), "[\"SECURITY\"]")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.roles[0]").value("SECURITY"))
                .andReturn();
        String securityEmail = JsonPath.read(securityResult.getResponse().getContentAsString(), "$.email");

        // Nace habilitada: puede iniciar sesion de inmediato.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(securityEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("SECURITY"));
    }

    @Test
    void adminCannotCreateGerenciaRole() throws Exception {
        String adminToken = loginAdmin();

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createUserBody("Jefa", "Gerencia",
                                uniqueEmail("gerencia"), "[\"GERENCIA\"]")))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void regularUserCannotAccessAdminEndpoints() throws Exception {
        String adminToken = loginAdmin();
        String email = uniqueEmail("user");

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email, residentCode)))
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
        mockMvc.perform(get("/api/users/pending").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    private String loginAdmin() throws Exception {
        return login(ADMIN_EMAIL);
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    private long firstApartmentId(String adminToken) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/apartments/options")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(),
                "$[0].id")).longValue();
    }

    private long findPendingId(String adminToken, String email) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/users/pending")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        java.util.List<?> ids = JsonPath.read(result.getResponse().getContentAsString(),
                "$.content[?(@.email == '" + email + "')].id");
        return ((Number) ids.get(0)).longValue();
    }

    private String registerBody(String email, String code) {
        return """
                {"firstName":"Test","lastName":"Residente","email":"%s","phone":"+34600111222",
                 "password":"%s","registrationCode":"%s"}
                """.formatted(email, PASSWORD, code);
    }

    private String createUserBody(String firstName, String lastName, String email, String roles) {
        return """
                {"firstName":"%s","lastName":"%s","email":"%s","password":"%s","roles":%s}
                """.formatted(firstName, lastName, email, PASSWORD, roles);
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
