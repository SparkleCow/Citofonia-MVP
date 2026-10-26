package com.sparklecow.citofonia.attachment.controller;

import com.sparklecow.citofonia.attachment.dto.AttachmentResponse;
import com.sparklecow.citofonia.attachment.service.AttachmentService;
import com.sparklecow.citofonia.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Adjuntos", description = "Subida y consulta de fotos/archivos locales para visitas, correspondencia u otros registros")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    @Operation(summary = "Subir foto/archivo", description = "Guarda el archivo en uploads/ con fecha y lo vincula a una entidad (VISIT, CORRESPONDENCE, etc.)")
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AttachmentResponse upload(@RequestParam("file") MultipartFile file,
                                     @RequestParam("entityType") String entityType,
                                     @RequestParam(value = "entityId", required = false) Long entityId,
                                     @AuthenticationPrincipal User uploader) {
        return attachmentService.upload(file, entityType, entityId, uploader);
    }

    @Operation(summary = "Listar adjuntos por entidad", description = "Devuelve los archivos subidos asociados a entityType/entityId")
    @PreAuthorize("hasAnyRole('ADMIN','CONCIERGE')")
    @GetMapping
    public List<AttachmentResponse> list(@RequestParam("entityType") String entityType,
                                        @RequestParam("entityId") Long entityId) {
        return attachmentService.list(entityType, entityId);
    }
}
