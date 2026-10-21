package com.sparklecow.citofonia.notification;

/**
 * Perfil de vivienda de un usuario para fines de notificacion.
 */
public enum HousingProfile {

    /** Reside en su vivienda (propietario residente o inquilino). */
    RESIDENT,

    /** Propietario de una vivienda en la que no reside. */
    OWNER_ABSENT,

    /** Tiene vivienda pero no reside en ella (caso no contemplado hoy). */
    NON_RESIDENT,

    /** Sin vivienda vinculada (administracion, consergeria...). */
    NONE
}
