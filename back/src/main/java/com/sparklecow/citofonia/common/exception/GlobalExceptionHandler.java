package com.sparklecow.citofonia.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Manejador global de excepciones: centraliza la traduccion a respuestas
 * JSON con el formato {@link ErrorResponse}.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Excepciones de dominio: se respetan el estado HTTP definido en la excepcion. */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getMessage(), request.getRequestURI());
    }

    /** Errores de validacion de Bean Validation en DTOs. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                          HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, "Errores de validacion en la peticion", request.getRequestURI(),
                fieldErrors);
    }

    /** Cuerpo JSON mal formado o de tipo inesperado. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex,
                                                           HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "El cuerpo de la peticion no es valido", request.getRequestURI());
    }

    /** Parametros de ruta o query con tipo incorrecto. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                            HttpServletRequest request) {
        String message = "Parametro invalido: " + ex.getName();
        return build(HttpStatus.BAD_REQUEST, message, request.getRequestURI());
    }

    /** Violaciones de restricciones fuera de DTOs (ej. @Validated en controllers). */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex,
                                                                   HttpServletRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getConstraintViolations()
                .forEach(violation -> fieldErrors.putIfAbsent(violation.getPropertyPath().toString(),
                        violation.getMessage()));
        return build(HttpStatus.BAD_REQUEST, "Restricciones violadas en la peticion", request.getRequestURI(),
                fieldErrors);
    }

    /** Metodo HTTP no soportado por el recurso. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                                  HttpServletRequest request) {
        String message = "Metodo HTTP no soportado: " + ex.getMethod();
        return build(HttpStatus.METHOD_NOT_ALLOWED, message, request.getRequestURI());
    }

    /** Fallo de autenticacion no capturado previamente por el filtro de seguridad. */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(AuthenticationException ex,
                                                              HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage(), request.getRequestURI());
    }

    /** Fallo de autorizacion no capturado previamente por el handler de seguridad. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex,
                                                            HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "No tiene permisos para acceder a este recurso",
                request.getRequestURI());
    }

    /** Ultima barrera: errores inesperados no exponen detalles internos. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Error inesperado en {}", request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", request.getRequestURI());
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message, String path) {
        return ResponseEntity.status(status).body(ErrorResponse.of(status, message, path));
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status,
                                                String message,
                                                String path,
                                                Map<String, String> fieldErrors) {
        return ResponseEntity.status(status).body(ErrorResponse.of(status, message, path, fieldErrors));
    }
}
