package com.sparklecow.citofonia.correspondence.entity;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.common.entity.BaseEntity;
import com.sparklecow.citofonia.user.entity.User;
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
 * Correspondencia recibida en el portal (paquetes, cartas, documentos).
 *
 * <p>Es el registro de auditoria de la vivienda: cada correspondencia queda
 * linked al apartamento al que se dirige (relacion N-1 con
 * {@link Apartment}), de modo que se puede reconstruir el historico de
 * entregas de cada vivienda.</p>
 *
 * <p>La anota consergeria o administracion; despues se avisa al destinatario
 * (un resident de esa vivienda) por buzon o por telefono y se decide si se
 * entrega en la vivienda o queda en porteria para que la recoja.</p>
 */
@Entity
@Table(name = "correspondences")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Correspondence extends BaseEntity {

    /** Apartamento al que se dirige la correspondencia (nunca nulo: es la auditoria). */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    /** Que es: paquete, carta, documento... */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CorrespondenceType type;

    /** Descripcion del contenido (opcional). */
    @Column(length = 200)
    private String description;

    /** Transportista, correo o empresa que entrega (opcional). */
    @Column(length = 120)
    private String carrier;

    /** Numero de seguimiento o de expediente (opcional). */
    @Column(length = 64)
    private String trackingNumber;

    /**
     * Destinatario: resident de la vivienda a quien se entrega. Puede ser
     * {@code null} cuando la correspondencia es para la vivienda en general.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    /** Donde se entrega: en la vivienda o en porteria. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CorrespondenceDelivery delivery = CorrespondenceDelivery.PORTERIA;

    /** Estado de la correspondencia dentro del ciclo de aviso. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CorrespondenceStatus status = CorrespondenceStatus.PENDING;

    /** Instante en que se recibio la correspondencia en el portal. */
    @Column(nullable = false)
    private Instant receivedAt;

    /** Instante en que se aviso al resident (null si todavia no se ha avisado). */
    private Instant notifiedAt;

    /** Emails de los residentes avisados, separados por coma. */
    @Column(length = 320)
    private String notifiedTo;

    /** Instante en que el resident recogio o recibio la correspondencia. */
    private Instant collectedAt;

    /** Observaciones de consergeria (opcional). */
    @Column(length = 500)
    private String notes;

    /** Email del conserje o administrador que anoto la correspondencia. */
    @Column(nullable = false, length = 160)
    private String registeredByEmail;

    public Correspondence(Apartment apartment, CorrespondenceType type, String description, String carrier,
                           String trackingNumber, User recipient, CorrespondenceDelivery delivery,
                           Instant receivedAt, String notes, String registeredByEmail) {
        this.apartment = apartment;
        this.type = type;
        this.description = description;
        this.carrier = carrier;
        this.trackingNumber = trackingNumber;
        this.recipient = recipient;
        this.delivery = delivery;
        this.receivedAt = receivedAt;
        this.notes = notes;
        this.registeredByEmail = registeredByEmail;
    }
}
