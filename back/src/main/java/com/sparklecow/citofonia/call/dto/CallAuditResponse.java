package com.sparklecow.citofonia.call.dto;

import com.sparklecow.citofonia.call.entity.CallAudit;
import com.sparklecow.citofonia.call.entity.CallOutcome;
import com.sparklecow.citofonia.call.entity.CallType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Representacion publica de una llamada auditada.
 */
@Schema(description = "Llamada registrada en el historial del citofono")
public record CallAuditResponse(

        @Schema(description = "Identificador interno")
        Long id,

        @Schema(description = "Identificador de la llamada generado por el extremo llamante")
        String callId,

        @Schema(description = "Tipo de llamada")
        CallType type,

        @Schema(description = "Email del llamante")
        String callerEmail,

        @Schema(description = "Email de quien atendio (null si no se atendio)")
        String calleeEmail,

        @Schema(description = "Vivienda del llamante")
        String callerApartmentIdentifier,

        @Schema(description = "Vivienda destinataria")
        String targetApartmentIdentifier,

        @Schema(description = "true si la llamada timbro a varios destinatarios")
        boolean multiTarget,

        @Schema(description = "true si la llamada fue una alerta general")
        boolean alert,

        @Schema(description = "Inicio de la llamada")
        Instant startedAt,

        @Schema(description = "Momento en que se atendio (null si no se atendio)")
        Instant answeredAt,

        @Schema(description = "Fin de la llamada (null si sigue en curso)")
        Instant endedAt,

        @Schema(description = "Resultado de la llamada (null si sigue en curso)")
        CallOutcome outcome,

        @Schema(description = "Email de quien finalizo la llamada")
        String endedByEmail,

        @Schema(description = "Motivo de cierre")
        String endReason) {

    public static CallAuditResponse from(CallAudit audit) {
        return new CallAuditResponse(
                audit.getId(),
                audit.getCallId(),
                audit.getType(),
                audit.getCallerEmail(),
                audit.getCalleeEmail(),
                audit.getCallerApartmentIdentifier(),
                audit.getTargetApartmentIdentifier(),
                audit.isMultiTarget(),
                audit.isAlert(),
                audit.getStartedAt(),
                audit.getAnsweredAt(),
                audit.getEndedAt(),
                audit.getOutcome(),
                audit.getEndedByEmail(),
                audit.getEndReason());
    }
}
