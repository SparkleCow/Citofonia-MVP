package com.sparklecow.citofonia.apartment.repository;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repositorio de apartamentos. Excluye por defecto las unidades eliminadas. */
@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long> {

    Optional<Apartment> findByIdAndDeletedFalse(Long id);

    Page<Apartment> findAllByDeletedFalse(Pageable pageable);

    List<Apartment> findAllByDeletedFalse();

    boolean existsByIdentifier(String identifier);

    boolean existsByIdentifierAndDeletedFalse(String identifier);
}
