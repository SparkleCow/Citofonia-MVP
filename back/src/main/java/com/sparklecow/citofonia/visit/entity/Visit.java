package com.sparklecow.citofonia.visit.entity;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.common.entity.BaseEntity;
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
 * Visita de un tercero al portal de un apartamento.
 *
 * <p>Es el registro de auditoria del edificio: cada visita queda linked al
 * apartamento al que se dirige (relacion N-1 con {@link Apartment}), de modo
 * que se puede reconstruir el historico de visitas de cada vivienda.</p>
 *
 * <p>La anota consergeria o administracion; despues se avisa a los residentes
 * que residen en esa vivienda y, si procede, se les llama por el interfono.
 * Solo los residentes que residen en el apartamento pueden recibir el aviso
 * (inquilinos y propietarios que viven en sitio).</p>
 */
@Entity
@Table(name = "visits")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Visit extends BaseEntity {

    /** Apartamento al que se dirige la visita (nunca nulo: es la auditoria). */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    /** Nombre de la persona que visita. */
    @Column(nullable = false, length = 120)
    private String visitorName;

    /** Documento de identidad del visitante (opcional). */
    @Column(length = 32)
    private String visitorDocument;

    /** Telefono de contacto del visitante (opcional). */
    @Column(length = 32)
    private String visitorPhone;

    /** Empresa, entidad o relacion con el resident (opcional). */
    @Column(length = 120)
    private String visitorCompany;

    /** Motivo de la visita y observaciones de consergeria (opcional). */
    @Column(length = 500)
    private String notes;

    /** Instante de entrada en el portal. */
    @Column(nullable = false)
    private Instant entryAt;

    /** Instante de salida (null si el visitante sigue dentro). */
    private Instant exitAt;

    /** Estado de la visita dentro del ciclo de aviso. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VisitStatus status = VisitStatus.PENDING;

    /** Instante en que se aviso al resident (null si todavia no se ha avisado). */
    private Instant notifiedAt;

    /** Emails de los residentes avisados, separados por coma. */
    @Column(length = 320)
    private String notifiedTo;

    /** Email del conserje o administrador que anoto la visita. */
    @Column(nullable = false, length = 160)
    private String registeredByEmail;

    public Visit(Apartment apartment, String visitorName, String visitorDocument, String visitorPhone,
                 String visitorCompany, String notes, Instant entryAt, String registeredByEmail) {
        this.apartment = apartment;
        this.visitorName = visitorName;
        this.visitorDocument = visitorDocument;
        this.visitorPhone = visitorPhone;
        this.visitorCompany = visitorCompany;
        this.notes = notes;
        this.entryAt = entryAt;
        this.registeredByEmail = registeredByEmail;
    }
}
