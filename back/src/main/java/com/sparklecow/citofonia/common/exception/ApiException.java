package com.sparklecow.citofonia.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Excepcion base de dominio con estado HTTP asociado.
 * Se captura de forma global en {@link GlobalExceptionHandler}.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    protected ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
