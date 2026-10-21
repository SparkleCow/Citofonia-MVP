package com.sparklecow.citofonia.correspondence.dto;

import com.sparklecow.citofonia.correspondence.entity.CorrespondenceDelivery;
import com.sparklecow.citofonia.correspondence.entity.CorrespondenceType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * Anotacion de una correspondencia recibida en el portal por parte de
 * consergeria.
 */
@Schema(description = "Datos de la correspondencia que anota la consergeria")
public record CorrespondenceRequest(

        @NotNull(message = "El apartamento es obligatorio")
        @Schema(description = "Apartamento al que se dirige la correspondencia", example = "3")
        Long apartmentId,

        @NotNull(message = "El tipo de correspondencia es obligatorio")
        @Schema(description = "Que es: paquete, carta, documento u otro", example = "PAQUETE")
        CorrespondenceType type,

        @Size(max = 200, message = "La descripcion no puede superar 200 caracteres")
        @Schema(description = "Descripcion del contenido (opcional)", example = "Caja pequena de ropa")
        String description,

        @Size(max = 120, message = "El transportista no puede superar 120 caracteres")
        @Schema(description = "Transportista o empresa que entrega (opcional)", example = "SEUR")
        String carrier,

        @Size(max = 64, message = "El seguimiento no puede superar 64 caracteres")
        @Schema(description = "Numero de seguimiento (opcional)", example = "1Z999AA10123456784")
        String trackingNumber,

        @Schema(description = "Destinatario: resident de la vivienda (opcional)", example = "7")
        Long recipientId,

        @Schema(description = "Donde se entrega: en la vivienda o en porteria", example = "PORTERIA")
        CorrespondenceDelivery delivery,

        @Schema(description = "Instante de recepcion (opcional; por defecto, ahora)",
                example = "2026-10-21T10:15:00Z")
        Instant receivedAt,

        @Size(max = 500, message = "Las notas no pueden superar 500 caracteres")
        @Schema(description = "Observaciones de consergeria (opcional)", example = "Dejar en porteria")
        String notes) {
}
