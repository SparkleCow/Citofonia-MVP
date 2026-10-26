package com.sparklecow.citofonia.call.entity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CallAuditRepository extends JpaRepository<CallAudit, Long> {
    Optional<CallAudit> findByCallId(String callId);
}
