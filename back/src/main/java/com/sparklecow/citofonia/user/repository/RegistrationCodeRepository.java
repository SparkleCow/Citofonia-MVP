package com.sparklecow.citofonia.user.repository;

import com.sparklecow.citofonia.user.entity.RegistrationCode;
import com.sparklecow.citofonia.user.entity.User;
import com.sparklecow.citofonia.user.enums.RoleName;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repositorio de codigos de registro. */
@Repository
public interface RegistrationCodeRepository extends JpaRepository<RegistrationCode, Long> {

    Optional<RegistrationCode> findByCode(String code);

    boolean existsByCode(String code);

    List<RegistrationCode> findByUsedFalseAndExpiresAtAfter(Instant now);

    /**
     * Marca el codigo como usado de forma atomica solo si sigue vigente y su
     * rol objetivo coincide con el rol solicitado.
     *
     * <p>{@code flushAutomatically = true} garantiza que las asociaciones
     * pendientes del usuario recien creado (tabla {@code app_users_roles}) se
     * persistan antes de limpiar el contexto de persistencia. Sin este flush,
     * {@code clearAutomatically = true} descartaria los roles asignados.</p>
     *
     * @return filas afectadas: 1 si el codigo se consumio, 0 si ya estaba
     *         usado, expirado, no existe o no corresponde al rol solicitado.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE RegistrationCode c
               SET c.used = true, c.usedBy = :user, c.usedAt = :now
             WHERE c.code = :code AND c.used = false AND c.expiresAt > :now
               AND c.targetRole = :role
            """)
    int consumeCode(@Param("code") String code,
                    @Param("user") User user,
                    @Param("now") Instant now,
                    @Param("role") RoleName role);
}
