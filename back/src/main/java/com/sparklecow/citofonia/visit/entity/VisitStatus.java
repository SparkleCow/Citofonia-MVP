package com.sparklecow.citofonia.visit.entity;

/**
 * Estado de una visita registrada por consergeria.
 *
 * <p>El ciclo habitual es: {@code PENDING} (anotada) -> {@code NOTIFIED}
 * (el resident ya ha sido avisado) -> {@code ADMITTED} o {@code REJECTED}
 * (el resident decide) -> {@code CLOSED} (el visitante se retira).</p>
 */
public enum VisitStatus {

    /** Visitante anotado y a la espera de avisar al resident. */
    PENDING,

    /** El resident de la vivienda ya ha sido avisado de la visita. */
    NOTIFIED,

    /** El resident ha autorizado el acceso del visitante. */
    ADMITTED,

    /** El resident no ha autorizado el acceso del visitante. */
    REJECTED,

    /** El visitante se ha retirado: visita finalizada. */
    CLOSED
}
