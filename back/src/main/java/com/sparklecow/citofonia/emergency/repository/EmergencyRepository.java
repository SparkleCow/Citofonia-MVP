package com.sparklecow.citofonia.emergency.repository;

import com.sparklecow.citofonia.emergency.entity.Emergency;
import com.sparklecow.citofonia.emergency.entity.EmergencyStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmergencyRepository extends JpaRepository<Emergency, Long> {

    List<Emergency> findAllByStatusOrderByCreatedAtDesc(EmergencyStatus status);

    Page<Emergency> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(EmergencyStatus status);

    List<Emergency> findTop5ByOrderByCreatedAtDesc();
}
