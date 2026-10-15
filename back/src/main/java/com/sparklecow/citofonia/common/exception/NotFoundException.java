package com.sparklecow.citofonia.common.exception;

import org.springframework.http.HttpStatus;

/** Recurso inexistente (404). */
public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
