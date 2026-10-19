package com.sparklecow.citofonia.notification;

/**
 * Tipos de notificacion del portal.
 *
 * <p>Las notificaciones <strong>generales</strong> van a toda cuenta activa.
 * Las <strong>operativas</strong> (visitas y domicilios) solo a quien reside
 * en una vivienda vinculada.</p>
 */
public enum NotificationType {

    /** Mensajes generales del portal (todas las cuentas habilitadas). */
    GENERAL,

    /** Llegada de visitas al apartamento (solo quien reside en la vivienda). */
    VISIT,

    /** Entrega de domicilios en el apartamento (solo quien reside en la vivienda). */
    DELIVERY
}
