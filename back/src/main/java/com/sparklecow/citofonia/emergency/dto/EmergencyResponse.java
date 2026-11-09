package com.sparklecow.citofonia.emergency.dto;

import com.sparklecow.citofonia.emergency.entity.Emergency;
import com.sparklecow.citofonia.emergency.entity.EmergencyStatus;
import java.time.Instant;

public record EmergencyResponse(
        Long id,
        EmergencyStatus status,
        String message,
        String triggeredByEmail,
        String triggeredByName,
        String triggeredFromApartment,
        Instant createdAt,
        int notifiedCount,
        Instant resolvedAt,
        String resolvedByEmail,
        String resolutionNotes) {

    public static EmergencyResponse from(Emergency emergency) {
        return new EmergencyResponse(
                emergency.getId(),
                emergency.getStatus(),
                emergency.getMessage(),
                emergency.getTriggeredByEmail(),
                emergency.getTriggeredByName(),
                emergency.getTriggeredFromApartment(),
                emergency.getCreatedAt(),
                emergency.getNotifiedCount(),
                emergency.getResolvedAt(),
                emergency.getResolvedByEmail(),
                emergency.getResolutionNotes());
    }
}
