package com.sparklecow.citofonia.call.repository;

import com.sparklecow.citofonia.call.entity.CallAudit;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallAuditRepository extends JpaRepository<CallAudit, Long> {
    Optional<CallAudit> findByCallId(String callId);

    long countByStartedAtGreaterThanEqual(Instant since);

    long countByAlertTrueAndStartedAtGreaterThanEqual(Instant since);

    List<CallAudit> findTop5ByOrderByStartedAtDesc();
}
