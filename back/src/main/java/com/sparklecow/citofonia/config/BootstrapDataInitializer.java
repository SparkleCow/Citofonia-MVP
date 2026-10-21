package com.sparklecow.citofonia.config;

import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.RoleRepository;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.util.EnumSet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inicializa los roles del sistema y la cuenta de administrador por defecto.
 *
 * <p>La cuenta de administrador solo se crea si la propiedad
 * {@code app.security.bootstrap.admin-password} tiene valor (nunca vacia en
 * produccion salvo que se inyecte explicitamente).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BootstrapDataInitializer implements ApplicationRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${app.security.bootstrap.admin-first-name:Administrador}")
    private String adminFirstName;

    @Value("${app.security.bootstrap.admin-last-name:Sistema}")
    private String adminLastName;

    @Value("${app.security.bootstrap.admin-password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        migrateLegacyRoles();
        ensureRolesExist();
        ensureAdminExists();
    }

    /**
     * Migra nombres de rol obsoletos que ya no existen en {@link RoleName}
     * (p. ej. {@code SECURITY} renombrado a {@code CONCIERGE}). Se hace por SQL
     * nativo porque la entidad {@link Role} no puede hidratar un valor que ya
     * no es un enum valido. Si el rol destino ya existia, se reasignan los
     * usuarios y se elimina el rol obsoleto; si no, se renombra directamente.
     */
    private void migrateLegacyRoles() {
        migrateRole("SECURITY", RoleName.CONCIERGE.name());
    }

    private void migrateRole(String legacyName, String currentName) {
        boolean targetExists = roleRepository.existsByName(RoleName.valueOf(currentName));
        if (!targetExists) {
            int renamed = roleRepository.renameRole(legacyName, currentName);
            if (renamed > 0) {
                log.info("Rol obsoleto {} migrado a {}", legacyName, currentName);
            }
            return;
        }
        int reassigned = roleRepository.reassignUsers(legacyName, currentName);
        int unlinked = roleRepository.unlinkUsers(legacyName);
        int deleted = roleRepository.deleteByName(legacyName);
        if (unlinked > 0 || deleted > 0) {
            log.info("Rol obsoleto {} eliminado tras reasignar {} vinculos a {}",
                    legacyName, reassigned, currentName);
        }
    }

    private void ensureRolesExist() {
        for (RoleName roleName : RoleName.values()) {
            if (!roleRepository.existsByName(roleName)) {
                roleRepository.save(new Role(roleName));
                log.info("Rol creado: {}", roleName);
            }
        }
    }

    private void ensureAdminExists() {
        if (adminEmail == null || adminEmail.isBlank()
                || adminPassword == null || adminPassword.isBlank()) {
            log.info("Bootstrap de administrador omitido: credenciales no configuradas");
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User admin = new User(
                adminFirstName,
                adminLastName,
                email,
                passwordEncoder.encode(adminPassword),
                true);
        roleRepository.findByName(RoleName.ADMIN)
                .ifPresent(role -> admin.getRoles().add(role));
        admin.getRoles().add(roleRepository.findByName(RoleName.USER)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.USER))));
        userRepository.save(admin);
        log.info("Cuenta de administrador inicial creada: {}", email);
    }
}
