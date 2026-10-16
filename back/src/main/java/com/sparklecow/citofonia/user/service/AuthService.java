package com.sparklecow.citofonia.user.service;

import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.common.exception.ConflictException;
import com.sparklecow.citofonia.common.exception.ForbiddenException;
import com.sparklecow.citofonia.common.exception.UnauthorizedException;
import com.sparklecow.citofonia.security.JwtService;
import com.sparklecow.citofonia.user.dto.JwtResponse;
import com.sparklecow.citofonia.user.dto.LoginRequest;
import com.sparklecow.citofonia.user.dto.RegisterRequest;
import com.sparklecow.citofonia.user.dto.UserResponse;
import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.user.repository.RegistrationCodeRepository;
import com.sparklecow.citofonia.user.repository.RoleRepository;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de autenticacion: inicio de sesion y autoregistro con codigo.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RegistrationCodeRepository registrationCodeRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Autentica al usuario y emite un token JWT.
     *
     * @throws UnauthorizedException si las credenciales no son validas.
     * @throws ForbiddenException si la cuenta esta deshabilitada o bloqueada.
     */
    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticate(request.email(), request.password());
        User user = (User) authentication.getPrincipal();
        String token = jwtService.generateToken(user);
        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .toList();
        log.info("Usuario autenticado: {}", user.getEmail());
        return JwtResponse.bearer(token, user.getEmail(), roles);
    }

    /**
     * Registra una cuenta de <strong>cliente</strong> a partir de un codigo de
     * invitacion de rol {@code USER}.
     *
     * <p>La cuenta se crea <strong>deshabilitada</strong>: un administrador
     * debera habilitarla antes de que pueda iniciar sesion. El codigo se
     * consume de forma atomica (un solo uso).</p>
     *
     * @throws BadRequestException si el codigo es invalido, expirado, ya usado
     *         o no corresponde a un codigo de cliente.
     * @throws ConflictException si el email ya esta registrado.
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        return register(request, RoleName.USER);
    }

    /**
     * Registra una cuenta de <strong>vigilante/seguridad</strong> a partir de un
     * codigo de invitacion de rol {@code SECURITY}.
     *
     * <p>La cuenta se crea <strong>deshabilitada</strong> hasta que un
     * administrador la habilite.</p>
     *
     * @throws BadRequestException si el codigo es invalido, expirado, ya usado
     *         o no corresponde a un codigo de vigilante.
     * @throws ConflictException si el email ya esta registrado.
     */
    @Transactional
    public UserResponse registerSecurity(RegisterRequest request) {
        return register(request, RoleName.SECURITY);
    }

    private UserResponse register(RegisterRequest request, RoleName targetRole) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("El email ya esta registrado");
        }

        User user = new User(
                request.firstName().trim(),
                request.lastName().trim(),
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                false);
        user.getRoles().add(resolveRole(targetRole));
        User saved = userRepository.save(user);

        int consumed = registrationCodeRepository.consumeCode(
                request.registrationCode().trim().toUpperCase(), saved, Instant.now(), targetRole);
        if (consumed == 0) {
            // Lanza excepcion para revertir la transaccion completa del registro.
            throw new BadRequestException(
                    "El codigo de registro es invalido, esta expirado, ya fue utilizado "
                            + "o no corresponde al tipo de registro solicitado");
        }

        log.info("Nuevo {} registrado (pendiente de habilitacion): {}", targetRole, saved.getEmail());
        return UserResponse.from(saved);
    }

    private Authentication authenticate(String email, String password) {
        try {
            return authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
        } catch (DisabledException ex) {
            throw new ForbiddenException("La cuenta esta deshabilitada. Contacte con un administrador.");
        } catch (LockedException ex) {
            throw new ForbiddenException("La cuenta esta bloqueada o eliminada.");
        } catch (BadCredentialsException ex) {
            throw new UnauthorizedException("Credenciales invalidas");
        }
    }

    private Role resolveRole(RoleName roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Rol no encontrado en la base de datos: " + roleName));
    }
}
