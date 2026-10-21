package com.sparklecow.citofonia.user.repository;

import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.enums.RoleName;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repositorio de roles del sistema. */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(RoleName name);

    boolean existsByName(RoleName name);

    /**
     * Renombra el valor de un rol directamente en la columna, sin materializar
     * la entidad. Se usa para migrar nombres de rol obsoletos que ya no
     * existen en {@link RoleName} y que impedirian la hidratacion de la fila.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE roles SET name = :to WHERE name = :from", nativeQuery = true)
    int renameRole(@Param("from") String from, @Param("to") String to);

    /**
     * Vuelca los vinculos usuario-rol de un rol origen a un rol destino,
     * evitando duplicados. Necesario al migrar roles obsoletos cuando el rol
     * destino ya existe.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "INSERT INTO app_users_roles (user_id, roles_id) "
            + "SELECT ur.user_id, dst.id FROM app_users_roles ur, roles src, roles dst "
            + "WHERE ur.roles_id = src.id AND src.name = :from AND dst.name = :to "
            + "AND NOT EXISTS (SELECT 1 FROM app_users_roles x "
            + "WHERE x.user_id = ur.user_id AND x.roles_id = dst.id)",
            nativeQuery = true)
    int reassignUsers(@Param("from") String from, @Param("to") String to);

    /** Elimina el vinculo de todos los usuarios con un rol por nombre. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM app_users_roles WHERE roles_id = "
            + "(SELECT id FROM roles WHERE name = :name)", nativeQuery = true)
    int unlinkUsers(@Param("name") String name);

    /** Borra un rol por nombre sin materializar la entidad. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM roles WHERE name = :name", nativeQuery = true)
    int deleteByName(@Param("name") String name);
}
