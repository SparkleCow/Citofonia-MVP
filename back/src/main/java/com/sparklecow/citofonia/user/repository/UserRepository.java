package com.sparklecow.citofonia.user.repository;

import com.sparklecow.citofonia.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repositorio de usuarios. Todas las consultas excluyen las cuentas borradas
 * logicamente salvo que se indique lo contrario.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndDeletedFalse(String email);

    boolean existsByEmail(String email);

    List<User> findAllByDeletedFalse();

    Page<User> findAllByDeletedFalse(Pageable pageable);

    /** Cuentas creadas por autoregistro pendientes de habilitacion. */
    Page<User> findAllByDeletedFalseAndEnabledFalse(Pageable pageable);

    boolean existsByDocumentNumberIgnoreCase(String documentNumber);

    /** Residentes activos de un apartamento. */
    List<User> findAllByApartmentIdAndDeletedFalse(Long apartmentId);

    /** Residentes con vivienda vinculada, ordenados por nombre (directorio de llamadas). */
    @Query("""
            SELECT u FROM User u JOIN u.roles r
            WHERE r.name = com.sparklecow.citofonia.user.enums.RoleName.USER
              AND u.deleted = false AND u.apartment IS NOT NULL
            ORDER BY u.firstName, u.lastName
            """)
    List<User> findResidentsWithApartment();

    /**
     * Residentes que residen en una vivienda: rol residente, vivienda
     * vinculada y residencia actual en ella. Un propietario ausente
     * (no ocupa la vivienda) queda excluido.
     *
     * <p>Es el conjunto de personas que pueden recibir los avisos de una
     * visita y a las que se puede llamar al timbrar una vivienda.</p>
     */
    @Query("""
            SELECT u FROM User u JOIN u.roles r
            WHERE r.name = com.sparklecow.citofonia.user.enums.RoleName.USER
              AND u.deleted = false AND u.apartment IS NOT NULL
              AND u.apartment.id = :apartmentId AND u.occupiesApartment = true
            ORDER BY u.firstName, u.lastName
            """)
    List<User> findResidentsLivingInApartment(@Param("apartmentId") Long apartmentId);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.email = :email AND u.deleted = false")
    boolean existsActiveByEmail(@Param("email") String email);
}
