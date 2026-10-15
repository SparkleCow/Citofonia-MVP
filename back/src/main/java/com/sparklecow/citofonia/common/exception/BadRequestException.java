package com.sparklecow.citofonia.common.exception;

import org.springframework.http.HttpStatus;

/** Peticion invalida de negocio (400). */
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
