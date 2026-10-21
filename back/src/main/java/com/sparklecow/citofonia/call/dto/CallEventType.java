package com.sparklecow.citofonia.call.dto;

/**
 * Tipos de mensaje que viajan por la cola personal {@code /user/queue/calls}
 * durante el ciclo de vida de una llamada.
 */
public enum CallEventType {

    /** La consergeria llama a un residente o un residente llama a porteria. */
    INVITE,

    /**
     * Alerta general del edificio: la consergeria o la administracion avisa a
     * todos los residentes a la vez (boton de panico).
     */
    ALERT,

    /** El invitado ha aceptado la llamada. */
    ACCEPT,

    /** El invitado ha rechazado la llamada. */
    REJECT,

    /** Reenvio de senalizacion WebRTC (oferta SDP, respuesta o candidato ICE). */
    SIGNAL,

    /** La llamada ha finalizado (alguien cuelga, se desconecta o la atiende otro). */
    END,

    /** Error de negocio (destinatario invalido, permiso, llamada inexistente...). */
    ERROR
}
