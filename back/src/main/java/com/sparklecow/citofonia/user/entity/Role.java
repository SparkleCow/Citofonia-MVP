package com.sparklecow.citofonia.user.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import com.sparklecow.citofonia.user.enums.RoleName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;

/**
 * Rol del sistema. Implementa {@link GrantedAuthority} para poder usarse
 * directamente en la cadena de autenticacion de Spring Security.
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role extends BaseEntity implements GrantedAuthority {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 32)
    private RoleName name;

    public Role(RoleName name) {
        this.name = name;
    }

    /**
     * @return la autoridad con prefijo {@code ROLE_} (ej. {@code ROLE_ADMIN}).
     */
    @Override
    public String getAuthority() {
        return name.getAuthority();
    }
}
