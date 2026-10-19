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

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.email = :email AND u.deleted = false")
    boolean existsActiveByEmail(@Param("email") String email);
}
