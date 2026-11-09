package com.sparklecow.citofonia.emergency.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Alerta general del edificio. Queda registrado quien la activo y cuando, y quien la resolvio.
 * Tabla nueva (aditiva).
 */
@Entity
@Table(name = "emergencies")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Emergency extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String triggeredByEmail;

    @Column(nullable = false, length = 241)
    private String triggeredByName;

    /** Vivienda de quien la activo (null para personal sin vivienda). */
    @Column(length = 40)
    private String triggeredFromApartment;

    @Column(length = 200)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmergencyStatus status = EmergencyStatus.ACTIVE;

    /** Usuarios avisados al activarla. */
    private int notifiedCount;

    private Instant resolvedAt;

    @Column(length = 160)
    private String resolvedByEmail;

    @Column(length = 300)
    private String resolutionNotes;

    public Emergency(String triggeredByEmail, String triggeredByName, String triggeredFromApartment, String message) {
        this.triggeredByEmail = triggeredByEmail;
        this.triggeredByName = triggeredByName;
        this.triggeredFromApartment = triggeredFromApartment;
        this.message = message;
    }
}
