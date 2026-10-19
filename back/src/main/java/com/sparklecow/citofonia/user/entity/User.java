package com.sparklecow.citofonia.user.entity;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Usuario general del sistema.
 *
 * <p>Implementa {@link UserDetails} para integrarse directamente con el
 * {@code DaoAuthenticationProvider}. El borrado es logico: los usuarios
 * eliminados quedan marcados con {@code deleted = true} y deshabilitados,
 * pero sus datos se conservan.</p>
 */
@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, length = 120)
    private String firstName;

    @Column(nullable = false, length = 120)
    private String lastName;

    /** Identificador unico usado tambien como username de autenticacion. */
    @Column(nullable = false, unique = true, length = 160)
    private String email;

    /** Telefono de contacto del usuario. */
    @Column(length = 32)
    private String phone;

    /** Documento de identidad (DNI, cedula, pasaporte...). */
    @Column(unique = true, length = 32)
    private String documentNumber;

    /** Hash BCrypt de la contrasena. Nunca se expone en API. */
    @Column(nullable = false)
    private String password;

    /** {@code false} hasta que un administrador habilite la cuenta. */
    @Column(nullable = false)
    private boolean enabled;

    /** Borrado logico: la cuenta deja de ser utilizable sin destruir datos. */
    @Column(nullable = false)
    private boolean deleted;

    /** Auditoria: email del usuario que creo la cuenta. */
    @Column(length = 160)
    private String createdByEmail;

    /** Auditoria: email del ultimo usuario que modifico la cuenta. */
    @Column(length = 160)
    private String updatedByEmail;

    /** Ultimo inicio de sesion exitoso (null si nunca inicio sesion). */
    private Instant lastLoginAt;

    @ManyToMany(fetch = FetchType.EAGER)
    private Set<Role> roles = new LinkedHashSet<>();

    /**
     * Apartamento al que esta vinculado el usuario (su vivienda). Puede ser
     * {@code null} para cuentas sin unidad asignada (p. ej. administracion).
     * Se carga de forma eager porque {@code open-in-view} esta deshabilitado.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "apartment_id")
    private Apartment apartment;

    /**
     * {@code true} si el usuario es propietario de la vivienda; {@code false}
     * si es inquilino. Solo aplica a residentes con apartamento vinculado.
     */
    @Column(nullable = false)
    private boolean owner;

    /**
     * {@code true} si el usuario reside actualmente en la vivienda. Los
     * inquilinos siempre residen en ella; un propietario puede no residir
     * (propietario ausente) y entonces solo recibe notificaciones generales.
     */
    @Column(nullable = false)
    private boolean occupiesApartment = true;

    public User(String firstName, String lastName, String email, String password, boolean enabled) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.enabled = enabled;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /** Una cuenta borrada logicamente queda bloqueada para iniciar sesion. */
    @Override
    public boolean isAccountNonLocked() {
        return !deleted;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
