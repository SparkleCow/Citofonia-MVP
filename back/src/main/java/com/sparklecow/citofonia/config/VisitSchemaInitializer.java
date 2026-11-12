package com.sparklecow.citofonia.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate crea un CHECK con los valores del enum {@code VisitStatus} al crear
 * la tabla, pero {@code ddl-auto: update} no lo actualiza cuando el enum gana
 * un valor (p. ej. {@code PREAUTHORIZED}), y los INSERT con el valor nuevo
 * fallan. El proyecto no tiene migraciones, asi que se retira ese CHECK al
 * arrancar: el enum de Java ya valida el estado. Es idempotente.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VisitSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check");
        } catch (DataAccessException exception) {
            log.warn("No se pudo retirar visits_status_check; hazlo a mano si las visitas "
                    + "preautorizadas fallan al guardarse: {}", exception.getMessage());
        }
    }
}
