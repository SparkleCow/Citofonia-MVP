package com.sparklecow.citofonia.apartment;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea un conjunto de apartamentos de ejemplo en desarrollo cuando no existe
 * ninguno. Nunca se ejecuta en produccion (perfil {@code dev}).
 */
@Slf4j
@Profile("dev")
@Component
@RequiredArgsConstructor
public class ApartmentSeeder implements ApplicationRunner {

    private final ApartmentRepository apartmentRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (apartmentRepository.count() > 0) {
            return;
        }
        save("A-101", "Torre A", 1, "Planta baja con terraza");
        save("A-102", "Torre A", 1, null);
        save("A-201", "Torre A", 2, null);
        save("A-202", "Torre A", 2, null);
        save("B-101", "Torre B", 1, null);
        save("B-102", "Torre B", 1, null);
        save("B-201", "Torre B", 2, "Frente al parque");
        log.info("Apartamentos de ejemplo creados: {}", apartmentRepository.count());
    }

    private void save(String identifier, String block, Integer floor, String notes) {
        apartmentRepository.save(new Apartment(identifier, block, floor, notes));
    }
}
