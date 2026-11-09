package com.sparklecow.citofonia.user.service;

import com.sparklecow.citofonia.user.dto.ApproveUserRequest;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.PageImpl;
import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.ConflictException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.user.dto.CreateUserRequest;
import com.sparklecow.citofonia.user.dto.UpdateUserRequest;
import com.sparklecow.citofonia.user.dto.UserResponse;
import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.RoleRepository;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de gestion de usuarios.
 *
 * <p>Todas las operaciones de borrado son logicas: la cuenta se marca como
 * eliminada y deshabilitada, pero sus datos se conservan en base de datos.
 * Toda escritura deja auditoria (quien realizo el cambio).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ApartmentRepository apartmentRepository;
    private final PasswordEncoder passwordEncoder;

    /** Listado paginado de usuarios activos (sin borrados logicamente). */
    @Transactional(readOnly = true)
    public Page<UserResponse> list(Pageable pageable) {
        return userRepository.findAllByDeletedFalse(pageable).map(UserResponse::from);
    }

    /** Cuentas pendientes de habilitacion: creadas por autoregistro y aun deshabilitadas. */
    @Transactional(readOnly = true)
    public Page<UserResponse> listPending(Pageable pageable) {
        return userRepository.findAllByDeletedFalseAndApprovedFalse(pageable).map(UserResponse::from);
    }

    /**
     * Listado con filtros opcionales. El volumen de una copropiedad es pequeno, asi que se
     * filtra en memoria sobre los usuarios activos y se pagina el resultado.
     *
     * @param query       texto libre: nombre, apellido, email o apartamento
     * @param role        ADMIN, CONCIERGE o USER (residente)
     * @param apartmentId solo usuarios vinculados a ese apartamento
     * @param status      ACTIVE, DISABLED o PENDING
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> search(Pageable pageable, String query, RoleName role, Long apartmentId, String status) {
        String term = query == null ? "" : normalizeText(query);
        List<User> filtered = userRepository.findAllByDeletedFalse().stream()
                .filter(user -> role == null || user.getRoles().stream().anyMatch(r -> r.getName() == role))
                .filter(user -> apartmentId == null
                        || (user.getApartment() != null && apartmentId.equals(user.getApartment().getId())))
                .filter(user -> matchesStatus(user, status))
                .filter(user -> term.isEmpty() || normalizeText(String.join(" ",
                        user.getFirstName(), user.getLastName(), user.getEmail(),
                        user.getApartment() != null ? user.getApartment().getIdentifier() : "")).contains(term))
                .sorted(Comparator.comparing((User user) -> normalizeText(user.getFirstName()))
                        .thenComparing(user -> normalizeText(user.getLastName())))
                .toList();
        int from = (int) Math.min(pageable.getOffset(), filtered.size());
        int to = Math.min(from + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(from, to), pageable, filtered.size()).map(UserResponse::from);
    }

    /** Aprueba un registro pendiente: queda aprobado y activo. Los residentes salen con apartamento. */
    @Transactional
    public UserResponse approve(Long id, ApproveUserRequest request, User actor) {
        User user = findActiveUser(id);
        if (user.isApproved()) {
            throw new BadRequestException("El usuario no tiene un registro pendiente");
        }
        if (request != null && request.apartmentId() != null) {
            requireResidentRole(user);
            user.setApartment(findApartment(request.apartmentId()));
        }
        if (request != null && request.owner() != null) {
            user.setOwner(request.owner());
        }
        if (request != null && request.occupiesApartment() != null) {
            user.setOccupiesApartment(request.occupiesApartment());
        }
        if (!user.isOwner()) {
            user.setOccupiesApartment(true);
        }
        if (isPureResident(user) && user.getApartment() == null) {
            throw new BadRequestException("Asigna un apartamento al residente antes de aprobarlo");
        }
        user.setApproved(true);
        user.setEnabled(true);
        user.setUpdatedByEmail(actor.getEmail());
        log.info("Registro aprobado por {}: {}", actor.getEmail(), user.getEmail());
        return UserResponse.from(user);
    }

    /** Rechaza un registro pendiente (borrado logico: no se pierde el historico). */
    @Transactional
    public void reject(Long id, User actor) {
        User user = findActiveUser(id);
        if (user.isApproved()) {
            throw new BadRequestException("Solo se pueden rechazar registros pendientes");
        }
        user.setDeleted(true);
        user.setEnabled(false);
        user.setUpdatedByEmail(actor.getEmail());
        log.info("Registro rechazado por {}: {}", actor.getEmail(), user.getEmail());
    }

    /** Detalle de un usuario activo por id. */
    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return UserResponse.from(findActiveUser(id));
    }

    /**
     * Creacion directa de un usuario de consergeria por administracion.
     * La cuenta nace habilitada porque el administrador ya realizo la verificacion.
     */
    @Transactional
    public UserResponse create(CreateUserRequest request, User actor) {
        if (userRepository.existsByEmail(request.email().trim().toLowerCase())) {
            throw new ConflictException("El email ya esta registrado");
        }
        if (request.documentNumber() != null && !request.documentNumber().isBlank()
                && userRepository.existsByDocumentNumberIgnoreCase(request.documentNumber().trim())) {
            throw new ConflictException("El documento de identidad ya esta registrado");
        }
        User user = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                true);
        if (request.phone() != null && !request.phone().isBlank()) {
            user.setPhone(request.phone().trim());
        }
        if (request.documentNumber() != null && !request.documentNumber().isBlank()) {
            user.setDocumentNumber(request.documentNumber().trim().toUpperCase());
        }
        user.setRoles(resolveRoles(request.roles()));
        if (request.apartmentId() != null) {
            requireResidentRole(user);
            user.setApartment(findApartment(request.apartmentId()));
        }
        if (isPureResident(user) && user.getApartment() == null) {
            throw new BadRequestException("Los residentes deben tener un apartamento asignado");
        }
        if (hasResidentRole(user)) {
            boolean owner = Boolean.TRUE.equals(request.owner());
            user.setOwner(owner);
            user.setOccupiesApartment(!owner || !Boolean.FALSE.equals(request.occupiesApartment()));
        }
        user.setCreatedByEmail(actor.getEmail());
        user.setUpdatedByEmail(actor.getEmail());
        User saved = userRepository.save(user);
        log.info("Usuario creado por administracion {} ({})", saved.getEmail(), actor.getEmail());
        return UserResponse.from(saved);
    }

    /** Actualiza nombre, apellido, telefono, documento y/o roles de un usuario. */
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request, User actor) {
        User user = findActiveUser(id);
        if (request.firstName() != null && !request.firstName().isBlank()) {
            user.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            user.setLastName(request.lastName().trim());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone().isBlank() ? null : request.phone().trim());
        }
        if (request.documentNumber() != null && !request.documentNumber().isBlank()) {
            String document = request.documentNumber().trim().toUpperCase();
            if (!document.equalsIgnoreCase(user.getDocumentNumber())
                    && userRepository.existsByDocumentNumberIgnoreCase(document)) {
                throw new ConflictException("El documento de identidad ya esta registrado");
            }
            user.setDocumentNumber(document);
        }
        if (request.roles() != null) {
            user.setRoles(resolveRoles(request.roles()));
            if (!hasResidentRole(user)) {
                user.setApartment(null);
                user.setOwner(false);
                user.setOccupiesApartment(true);
            }
        }
        if (request.apartmentId() != null) {
            requireResidentRole(user);
            user.setApartment(findApartment(request.apartmentId()));
        }
        if (request.owner() != null) {
            user.setOwner(request.owner());
        }
        if (request.occupiesApartment() != null) {
            user.setOccupiesApartment(request.occupiesApartment());
        }
        if (!user.isOwner()) {
            user.setOccupiesApartment(true);
        }
        if (isPureResident(user) && user.getApartment() == null && user.isEnabled()) {
            throw new BadRequestException("Los residentes deben tener un apartamento asignado");
        }
        user.setUpdatedByEmail(actor.getEmail());
        return UserResponse.from(user);
    }

    /**
     * Asigna o cambia el apartamento de un usuario. Si {@code apartmentId} es
     * {@code null}, el usuario queda sin vivienda vinculada (y se reinician
     * los indicadores de propietario/ocupa vivienda).
     *
     * <p>Solo los residentes (rol {@code USER}) pueden tener vivienda.</p>
     *
     * @throws BadRequestException si el usuario no es residente.
     * @throws NotFoundException si el usuario o el apartamento no existen.
     */
    @Transactional
    public UserResponse assignApartment(Long id, Long apartmentId, User actor) {
        User user = findActiveUser(id);
        if (apartmentId == null) {
            user.setApartment(null);
            user.setOwner(false);
            user.setOccupiesApartment(true);
            if (isPureResident(user) && user.isEnabled()) {
                // Un residente activo siempre tiene vivienda: al quitarlo se desactiva su cuenta
                // hasta que se le asigne otra (no se borra nada).
                user.setEnabled(false);
                log.info("Residente {} desactivado al quedar sin apartamento", user.getEmail());
            }
        } else {
            requireResidentRole(user);
            user.setApartment(findApartment(apartmentId));
        }
        user.setUpdatedByEmail(actor.getEmail());
        log.info("Usuario {} vinculado al apartamento {} por {}",
                user.getEmail(), apartmentId == null ? "ninguno" : apartmentId, actor.getEmail());
        return UserResponse.from(user);
    }

    /** Habilita una cuenta creada mediante autoregistro para que su titular pueda iniciar sesion. */
    @Transactional
    public UserResponse enable(Long id, User actor) {
        User user = findActiveUser(id);
        if (!user.isApproved()) {
            throw new BadRequestException("El registro esta pendiente: apruebalo desde Solicitudes pendientes");
        }
        if (isPureResident(user) && user.getApartment() == null) {
            throw new BadRequestException("Asigna un apartamento al residente antes de activarlo");
        }
        user.setEnabled(true);
        user.setUpdatedByEmail(actor.getEmail());
        log.info("Usuario habilitado por {}: {}", actor.getEmail(), user.getEmail());
        return UserResponse.from(user);
    }

    /** Deshabilita una cuenta sin poder volver a iniciar sesion. */
    @Transactional
    public UserResponse disable(Long id, User actor) {
        User user = findActiveUser(id);
        user.setEnabled(false);
        user.setUpdatedByEmail(actor.getEmail());
        log.info("Usuario deshabilitado por {}: {}", actor.getEmail(), user.getEmail());
        return UserResponse.from(user);
    }

    /**
     * Borrado logico de un usuario: se marca como eliminado y deshabilitado.
     * No se permite la autoreliminacion del administrador en sesion.
     */
    @Transactional
    public void delete(Long id, User actor) {
        if (id.equals(actor.getId())) {
            throw new BadRequestException("No puede eliminarse a si mismo");
        }
        User user = findActiveUser(id);
        user.setDeleted(true);
        user.setEnabled(false);
        user.setUpdatedByEmail(actor.getEmail());
        log.info("Usuario eliminado logicamente por {}: {}", actor.getEmail(), user.getEmail());
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

    /** Residente "puro": rol USER sin rol de personal (los admins tambien llevan USER). */
    private boolean isPureResident(User user) {
        return hasResidentRole(user) && user.getRoles().stream()
                .noneMatch(role -> role.getName() == RoleName.ADMIN || role.getName() == RoleName.CONCIERGE);
    }

    private boolean matchesStatus(User user, String status) {
        if (status == null || status.isBlank()) {
            return true;
        }
        return switch (status.trim().toUpperCase()) {
            case "PENDING" -> !user.isApproved();
            case "ACTIVE" -> user.isApproved() && user.isEnabled();
            case "DISABLED" -> user.isApproved() && !user.isEnabled();
            default -> true;
        };
    }

    private static String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .trim();
    }

    private boolean hasResidentRole(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.USER);
    }

    /**
     * Solo los usuarios con rol {@code USER} (residentes) pueden tener un
     * apartamento vinculado; administracion y consergeria no tienen vivienda.
     *
     * @throws BadRequestException si el usuario no tiene el rol residente.
     */
    private void requireResidentRole(User user) {
        if (!hasResidentRole(user)) {
            throw new BadRequestException("Solo los residentes pueden tener apartamento vinculado");
        }
    }

    private Set<Role> resolveRoles(Set<RoleName> roleNames) {
        Set<Role> roles = new LinkedHashSet<>();
        for (RoleName roleName : roleNames) {
            roles.add(roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Rol no encontrado: " + roleName)));
        }
        return roles;
    }
}
