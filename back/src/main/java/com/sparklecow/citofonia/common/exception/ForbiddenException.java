package com.sparklecow.citofonia.common.exception;

import org.springframework.http.HttpStatus;

/** Acceso denegado por permisos (403). */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}
