package com.sparklecow.citofonia.correspondence.entity;

/**
 * Estado de una correspondencia registrada por consergeria.
 *
 * <p>El ciclo habitual es: {@code PENDING} (anotada) -&gt; {@code NOTIFIED}
 * (el resident ya ha sido avisado) -&gt; {@code DELIVERED} (entregada en la
 * vivienda o recogida en porteria) o {@code RETURNED} (devuelta al
 * remitente).</p>
 */
public enum CorrespondenceStatus {

    /** Correspondencia anotada y a la espera de avisar al resident. */
    PENDING,

    /** El resident de la vivienda ya ha sido avisado. */
    NOTIFIED,

    /** Entregada al resident (en su vivienda o recogida en porteria). */
    DELIVERED,

    /** Devuelta al remitente. */
    RETURNED
}
