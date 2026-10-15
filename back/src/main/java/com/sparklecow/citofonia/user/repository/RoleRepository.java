package com.sparklecow.citofonia.user.repository;

import com.sparklecow.citofonia.user.entity.Role;
import com.sparklecow.citofonia.user.enums.RoleName;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repositorio de roles del sistema. */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(RoleName name);

    boolean existsByName(RoleName name);
}
