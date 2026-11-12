package com.sparklecow.citofonia.visit.repository;

import com.sparklecow.citofonia.visit.entity.Visit;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio de visitas. La consulta por apartamento es la base de la
 * auditoria: el historico de visitas de cada vivienda.
 */
@Repository
public interface VisitRepository extends JpaRepository<Visit, Long> {

    long countByStatusIn(java.util.Collection<com.sparklecow.citofonia.visit.entity.VisitStatus> statuses);

    List<Visit> findTop5ByOrderByCreatedAtDesc();

    /** Visitas del edificio, de la mas reciente a la mas antigua. */
    Page<Visit> findAllByOrderByEntryAtDesc(Pageable pageable);

    /** Visitas de una vivienda, de la mas reciente a la mas antigua. */
    Page<Visit> findAllByApartmentIdOrderByEntryAtDesc(Long apartmentId, Pageable pageable);

    /** Visita preautorizada a la que pertenece un codigo de acceso (QR). */
    java.util.Optional<Visit> findByAccessCode(String accessCode);

    /** Historial completo de visitas de una vivienda. */
    List<Visit> findAllByApartmentIdOrderByEntryAtDesc(Long apartmentId);
}
