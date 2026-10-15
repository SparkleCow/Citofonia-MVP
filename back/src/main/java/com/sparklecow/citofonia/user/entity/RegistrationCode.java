package com.sparklecow.citofonia.user.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * 7 dias.</p>
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

    public RegistrationCode(String code, User createdBy, Instant expiresAt) {
        this.code = code;
        this.createdBy = createdBy;
        this.expiresAt = expiresAt;
        this.used = false;
    }
}
