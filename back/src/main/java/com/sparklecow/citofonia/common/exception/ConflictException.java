package com.sparklecow.citofonia.common.exception;

import org.springframework.http.HttpStatus;

/** Conflicto con el estado actual del recurso (409). */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
