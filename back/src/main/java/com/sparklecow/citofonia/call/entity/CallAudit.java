package com.sparklecow.citofonia.call.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "call_audit")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CallAudit extends BaseEntity {

    @Column(nullable = false, length = 64)
    private String callId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CallType type;

    @Column(nullable = false, length = 160)
    private String callerEmail;

    @Column(length = 160)
    private String calleeEmail;

    @Column(length = 64)
    private String callerApartmentIdentifier;

    @Column(length = 64)
    private String targetApartmentIdentifier;

    private boolean multiTarget;

    private boolean alert;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant answeredAt;

    private Instant endedAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private CallOutcome outcome;

    @Column(length = 32)
    private String endedByEmail;

    @Column(length = 255)
    private String endReason;

    public CallAudit(String callId, CallType type, String callerEmail, String callerApartmentIdentifier,
                     String targetApartmentIdentifier, boolean multiTarget, boolean alert) {
        this.callId = callId;
        this.type = type;
        this.callerEmail = callerEmail;
        this.callerApartmentIdentifier = callerApartmentIdentifier;
        this.targetApartmentIdentifier = targetApartmentIdentifier;
        this.multiTarget = multiTarget;
        this.alert = alert;
        this.startedAt = Instant.now();
    }
}
