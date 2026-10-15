package com.sparklecow.citofonia.common.exception;

import org.springframework.http.HttpStatus;

/** Credenciales o estado de cuenta invalidos (401). */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
