package com.sparklecow.citofonia.call.service;

import com.sparklecow.citofonia.call.entity.CallAudit;
import com.sparklecow.citofonia.call.entity.CallOutcome;
import com.sparklecow.citofonia.call.entity.CallType;
import com.sparklecow.citofonia.call.repository.CallAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CallAuditService {

    private final CallAuditRepository repository;

    @Transactional
    public CallAudit recordStart(String callId, CallType type, String callerEmail,
                                String callerApartmentIdentifier, String targetApartmentIdentifier,
                                boolean multiTarget, boolean alert) {
        if (callId == null || callerEmail == null) {
            return null;
        }
        if (repository.findByCallId(callId).isPresent()) {
            return null;
        }
        CallAudit audit = new CallAudit(callId, type, callerEmail, callerApartmentIdentifier,
                targetApartmentIdentifier, multiTarget, alert);
        return repository.save(audit);
    }

    @Transactional
    public void recordAnswered(String callId, String calleeEmail) {
        if (callId == null) {
            return;
        }
        Optional<CallAudit> opt = repository.findByCallId(callId);
        if (opt.isEmpty()) {
            return;
        }
        CallAudit audit = opt.get();
        if (audit.getAnsweredAt() == null) {
            audit.setAnsweredAt(Instant.now());
            audit.setCalleeEmail(calleeEmail);
            audit.setOutcome(CallOutcome.ANSWERED);
            repository.save(audit);
        }
    }

    @Transactional
    public void recordEnd(String callId, String endedByEmail, CallOutcome outcome, String reason) {
        if (callId == null) {
            return;
        }
        Optional<CallAudit> opt = repository.findByCallId(callId);
        if (opt.isEmpty()) {
            return;
        }
        CallAudit audit = opt.get();
        if (audit.getEndedAt() == null) {
            audit.setEndedAt(Instant.now());
        }
        audit.setEndedByEmail(endedByEmail);
        if (audit.getOutcome() == null && outcome != null) {
            audit.setOutcome(outcome);
        } else if (audit.getOutcome() == null) {
            audit.setOutcome(CallOutcome.ENDED_BY_PARTICIPANT);
        }
        if (reason != null && !reason.isBlank()) {
            audit.setEndReason(reason);
        }
        repository.save(audit);
    }

    @Transactional
    public void recordRejected(String callId, String rejectedByEmail) {
        if (callId == null) {
            return;
        }
        Optional<CallAudit> opt = repository.findByCallId(callId);
        if (opt.isEmpty()) {
            return;
        }
        CallAudit audit = opt.get();
        if (audit.getOutcome() == null) {
            audit.setOutcome(CallOutcome.REJECTED);
            audit.setEndedByEmail(rejectedByEmail);
            if (audit.getEndedAt() == null) {
                audit.setEndedAt(Instant.now());
            }
            repository.save(audit);
        }
    }

    @Transactional
    public void recordNoAnswer(String callId) {
        if (callId == null) {
            return;
        }
        Optional<CallAudit> opt = repository.findByCallId(callId);
        if (opt.isEmpty()) {
            return;
        }
        CallAudit audit = opt.get();
        if (audit.getOutcome() == null) {
            audit.setOutcome(CallOutcome.NO_ANSWER);
            if (audit.getEndedAt() == null) {
                audit.setEndedAt(Instant.now());
            }
            repository.save(audit);
        }
    }
}
