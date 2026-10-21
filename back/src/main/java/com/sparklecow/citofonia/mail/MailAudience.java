package com.sparklecow.citofonia.mail;

/**
 * Audiencia de un mensaje enviado desde administracion.
 */
public enum MailAudience {

    /** Todos los usuarios con cuenta no borrada. */
    ALL,

    /** Solo residentes (rol USER). */
    RESIDENTS,

    /** Solo consergeria (rol CONCIERGE). */
    CONCIERGE,

    /** Lista explicita de destinatarios. */
    CUSTOM
}
