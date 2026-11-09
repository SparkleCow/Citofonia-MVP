package com.sparklecow.citofonia.mail;

/**
 * Audiencia de un mensaje enviado desde administracion.
 */
public enum MailAudience {

    /** Todos los usuarios activos y aprobados, excepto quien envia. */
    ALL,

    /** Solo residentes (rol USER). */
    RESIDENTS,

    /** Solo consergeria (rol CONCIERGE). */
    CONCIERGE,

    /** Residentes y consergeria a la vez (sin el resto de administradores). Max. 20 caracteres: columna audience. */
    RESIDENTS_CONCIERGE,

    /** Lista explicita de destinatarios. */
    CUSTOM
}
