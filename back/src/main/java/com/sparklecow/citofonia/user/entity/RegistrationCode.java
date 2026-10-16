package com.sparklecow.citofonia.user.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import com.sparklecow.citofonia.user.enums.RoleName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Codigo de registro de uso unico.
 *
 * <p>Un administrador genera el codigo en el backend y se lo facilita al nuevo
 * usuario. El codigo se consume en el primer registro exitoso y expira a los
 * 7 dias. Cada codigo esta asociado a un rol objetivo: {@code USER} para
 * clientes o {@code SECURITY} para personal de vigilancia, de forma que un
 * codigo de cliente no puede usarse para registrarse como vigilante.</p>
 */
@Entity
@Table(name = "registration_codes")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RegistrationCode extends BaseEntity {

    /** Codigo alfanumerico de un solo uso. */
    @Column(nullable = false, unique = true, length = 32)
    private String code;

    /**
     * Rol que se asignara al usuario que consuma el codigo. Solo admite
     * {@code USER} (cliente) o {@code SECURITY} (vigilante).
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, columnDefinition = "varchar(32) default 'USER'")
    private RoleName targetRole;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_by_id")
    private User usedBy;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false, updatable = false)
    private Instant expiresAt;

    private Instant usedAt;

    public RegistrationCode(String code, RoleName targetRole, User createdBy, Instant expiresAt) {
        this.code = code;
        this.targetRole = targetRole;
        this.createdBy = createdBy;
        this.expiresAt = expiresAt;
        this.used = false;
    }
}
