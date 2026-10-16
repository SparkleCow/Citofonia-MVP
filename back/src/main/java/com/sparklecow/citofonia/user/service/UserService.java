package com.sparklecow.citofonia.user.service;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.ConflictException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.user.dto.CreateUserRequest;
import com.sparklecow.citofonia.user.dto.RegistrationCodeResponse;
import com.sparklecow.citofonia.user.dto.UpdateUserRequest;
import com.sparklecow.citofonia.user.dto.UserResponse;
import com.sparklecow.citofonia.user.entity.RegistrationCode;
import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.RegistrationCodeRepository;
import com.sparklecow.citofonia.user.repository.RoleRepository;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de gestion de usuarios y codigos de invitacion.
 *
 * <p>Todas las operaciones de borrado son logicas: la cuenta se marca como
 * eliminada y deshabilitada, pero sus datos se conservan en base de datos.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    /** Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para facilitar el uso manual. */
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 10;
    private static final int CODE_VALIDITY_DAYS = 7;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RegistrationCodeRepository registrationCodeRepository;
    private final ApartmentRepository apartmentRepository;
    private final PasswordEncoder passwordEncoder;

    /** Listado paginado de usuarios activos (sin borrados logicamente). */
    @Transactional(readOnly = true)
    public Page<UserResponse> list(Pageable pageable) {
        return userRepository.findAllByDeletedFalse(pageable).map(UserResponse::from);
    }

    /** Detalle de un usuario activo por id. */
    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return UserResponse.from(findActiveUser(id));
    }

    /**
     * Creacion directa de un usuario por administracion.
     * La cuenta nace habilitada porque el administrador ya realizo la verificacion.
     */
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("El email ya esta registrado");
        }
        User user = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                true);
        user.setRoles(resolveRoles(request.roles()));
        if (request.apartmentId() != null) {
            user.setApartment(findApartment(request.apartmentId()));
        }
        User saved = userRepository.save(user);
        log.info("Usuario creado por administracion: {}", saved.getEmail());
        return UserResponse.from(saved);
    }

    /** Actualiza nombre, apellido y/o roles de un usuario. */
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        User user = findActiveUser(id);
        if (request.firstName() != null && !request.firstName().isBlank()) {
            user.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            user.setLastName(request.lastName().trim());
        }
        if (request.roles() != null) {
            user.setRoles(resolveRoles(request.roles()));
        }
        if (request.apartmentId() != null) {
            user.setApartment(findApartment(request.apartmentId()));
        }
        return UserResponse.from(user);
    }

    /**
     * Asigna o cambia el apartamento de un usuario. Si {@code apartmentId} es
     * {@code null}, el usuario queda sin vivienda vinculada.
     *
     * @throws NotFoundException si el usuario o el apartamento no existen.
     */
    @Transactional
    public UserResponse assignApartment(Long id, Long apartmentId) {
        User user = findActiveUser(id);
        user.setApartment(apartmentId == null ? null : findApartment(apartmentId));
        log.info("Usuario {} vinculado al apartamento {}", user.getEmail(),
                apartmentId == null ? "ninguno" : apartmentId);
        return UserResponse.from(user);
    }

    /** Habilita una cuenta para que su titular pueda iniciar sesion. */
    @Transactional
    public UserResponse enable(Long id) {
        User user = findActiveUser(id);
        user.setEnabled(true);
        log.info("Usuario habilitado: {}", user.getEmail());
        return UserResponse.from(user);
    }

    /** Deshabilita una cuenta sin poder volver a iniciar sesion. */
    @Transactional
    public UserResponse disable(Long id) {
        User user = findActiveUser(id);
        user.setEnabled(false);
        log.info("Usuario deshabilitado: {}", user.getEmail());
        return UserResponse.from(user);
    }

    /**
     * Borrado logico de un usuario: se marca como eliminado y deshabilitado.
     * No se permite la autore elimincacion del administrador en sesion.
     */
    @Transactional
    public void delete(Long id, Long currentUserId) {
        if (id.equals(currentUserId)) {
            throw new BadRequestException("No puede eliminarse a si mismo");
        }
        User user = findActiveUser(id);
        user.setDeleted(true);
        user.setEnabled(false);
        log.info("Usuario eliminado logicamente: {}", user.getEmail());
    }

    /**
     * Genera un nuevo codigo de invitacion de un solo uso y 7 dias de validez
     * para el rol objetivo indicado (cliente {@code USER} o vigilante
     * {@code SECURITY}).
     *
     * @throws BadRequestException si se intenta generar un codigo para
     *         {@code ADMIN}, rol que nunca puede autoregistrarse.
     */
    @Transactional
    public RegistrationCodeResponse generateRegistrationCode(User admin, RoleName targetRole) {
        if (targetRole == null || !targetRole.isRegistrable()) {
            throw new BadRequestException(
                    "Solo se pueden generar codigos para los roles USER (cliente) o SECURITY (vigilante)");
        }
        RegistrationCode code = new RegistrationCode(
                uniqueCode(), targetRole, admin, Instant.now().plus(CODE_VALIDITY_DAYS, ChronoUnit.DAYS));
        RegistrationCode saved = registrationCodeRepository.save(code);
        log.info("Codigo de registro {} para rol {} generado por {}",
                saved.getCode(), targetRole, admin.getEmail());
        return RegistrationCodeResponse.from(saved);
    }

    /** Codigos de registro vigentes: sin usar y no expirados. */
    @Transactional(readOnly = true)
    public List<RegistrationCodeResponse> listRegistrationCodes() {
        return registrationCodeRepository.findByUsedFalseAndExpiresAtAfter(Instant.now()).stream()
                .map(RegistrationCodeResponse::from)
                .toList();
    }

    private User findActiveUser(Long id) {
        return userRepository.findById(id)
                .filter(user -> !user.isDeleted())
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado con id " + id));
    }

    private Apartment findApartment(Long apartmentId) {
        return apartmentRepository.findByIdAndDeletedFalse(apartmentId)
                .orElseThrow(() -> new NotFoundException("Apartamento no encontrado con id " + apartmentId));
    }

    private Set<Role> resolveRoles(Set<RoleName> roleNames) {
        Set<Role> roles = new LinkedHashSet<>();
        for (RoleName roleName : roleNames) {
            roles.add(roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Rol no encontrado: " + roleName)));
        }
        return roles;
    }

    private String uniqueCode() {
        String code;
        do {
            code = randomCode();
        } while (registrationCodeRepository.existsByCode(code));
        return code;
    }

    private String randomCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return builder.toString();
    }
}
