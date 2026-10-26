package com.sparklecow.citofonia.attachment.service;

import com.sparklecow.citofonia.attachment.dto.AttachmentResponse;
import com.sparklecow.citofonia.attachment.entity.Attachment;
import com.sparklecow.citofonia.attachment.repository.AttachmentRepository;
import com.sparklecow.citofonia.common.exception.ApiException;
import com.sparklecow.citofonia.common.storage.FileStorageService;
import com.sparklecow.citofonia.user.entity.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private final FileStorageService fileStorageService;
    private final AttachmentRepository attachmentRepository;

    @Transactional
    public AttachmentResponse upload(MultipartFile file, String entityType, Long entityId, User uploader) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No se ha enviado ningun archivo");
        }
        if (entityType == null || entityType.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Falta el tipo de entidad");
        }
        FileStorageService.StoredFile stored = fileStorageService.store(file);
        Attachment attachment = new Attachment(
                stored.originalFilename(),
                stored.filename(),
                stored.relativePath(),
                stored.contentType(),
                stored.size(),
                entityType,
                entityId,
                uploader != null ? uploader.getEmail() : null
        );
        return AttachmentResponse.from(attachmentRepository.save(attachment));
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(String entityType, Long entityId) {
        return attachmentRepository.findByEntityTypeAndEntityId(entityType, entityId).stream()
                .map(AttachmentResponse::from)
                .toList();
    }
}
