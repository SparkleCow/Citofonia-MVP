package com.sparklecow.citofonia.correspondence.repository;

import com.sparklecow.citofonia.correspondence.entity.Correspondence;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio de correspondencias. La consulta por apartamento es la base de
 * la auditoria: el historico de entregas de cada vivienda.
 */
@Repository
public interface CorrespondenceRepository extends JpaRepository<Correspondence, Long> {

    /** Correspondencia del edificio, de la mas reciente a la mas antigua. */
    Page<Correspondence> findAllByOrderByReceivedAtDesc(Pageable pageable);

    /** Correspondencia de una vivienda, de la mas reciente a la mas antigua. */
    Page<Correspondence> findAllByApartmentIdOrderByReceivedAtDesc(Long apartmentId, Pageable pageable);

    /** Historial completo de correspondencia de una vivienda. */
    List<Correspondence> findAllByApartmentIdOrderByReceivedAtDesc(Long apartmentId);
}
