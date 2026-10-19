package com.sparklecow.citofonia.call;

/**
 * Error de negocio al gestionar una llamada (destinatario invalido, llamada
 * inexistente, permisos...). Se traduce a un mensaje de error en la cola
 * personal del usuario que lo provoco.
 */
public class CallException extends RuntimeException {

    public CallException(String message) {
        super(message);
    }
}
