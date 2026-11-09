package com.sparklecow.citofonia.attachment.service;

import com.sparklecow.citofonia.common.exception.ForbiddenException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.correspondence.repository.CorrespondenceRepository;
import com.sparklecow.citofonia.user.enums.RoleName;
import com.sparklecow.citofonia.visit.repository.VisitRepository;
import java.util.Set;
import org.springframework.core.io.Resource;
import com.sparklecow.citofonia.attachment.dto.AttachmentResponse;
import com.sparklecow.citofonia.attachment.entity.Attachment;
import com.sparklecow.citofonia.attachment.repository.AttachmentRepository;
import com.sparklecow.citofonia.common.exception.BadRequestException;
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
    private final CorrespondenceRepository correspondenceRepository;
    private final VisitRepository visitRepository;

    /** Entidades que admiten adjuntos. */
    private static final Set<String> ENTITY_TYPES = Set.of("CORRESPONDENCE", "VISIT");

    public record AttachmentContent(Resource resource, String contentType) {
    }

    @Transactional
    public AttachmentResponse upload(MultipartFile file, String entityType, Long entityId, User uploader) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No se ha enviado ningun archivo");
        }
        if (entityType == null || entityType.isBlank()) {
            throw new BadRequestException("Falta el tipo de entidad");
        }
        String type = entityType.trim().toUpperCase();
        if (!ENTITY_TYPES.contains(type)) {
            throw new BadRequestException("Tipo de entidad no admitido: " + entityType);
        }
        if (entityId == null) {
            throw new BadRequestException("Falta el registro al que pertenece el archivo");
        }
        boolean exists = "CORRESPONDENCE".equals(type)
                ? correspondenceRepository.existsById(entityId)
                : visitRepository.existsById(entityId);
        if (!exists) {
            throw new NotFoundException("No existe el registro " + type + " " + entityId);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!contentType.startsWith("image/") && !contentType.equals("application/pdf")) {
            throw new BadRequestException("Solo se admiten imagenes o PDF");
        }
        entityType = type;
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

    /** Contenido de un adjunto, comprobando que el usuario pueda verlo. */
    @Transactional(readOnly = true)
    public AttachmentContent content(Long id, User user) {
        Attachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Adjunto no encontrado con id " + id));
        if (!isStaff(user) && !belongsToUserHome(attachment, user)) {
            throw new ForbiddenException("No puedes ver archivos de otra vivienda");
        }
        return new AttachmentContent(fileStorageService.load(attachment.getRelativePath()),
                attachment.getContentType());
    }

    private boolean belongsToUserHome(Attachment attachment, User user) {
        if (user.getApartment() == null || attachment.getEntityId() == null) {
            return false;
        }
        Long homeId = user.getApartment().getId();
        return switch (attachment.getEntityType() == null ? "" : attachment.getEntityType()) {
            case "CORRESPONDENCE" -> correspondenceRepository.findById(attachment.getEntityId())
                    .map(c -> c.getApartment().getId().equals(homeId)).orElse(false);
            case "VISIT" -> visitRepository.findById(attachment.getEntityId())
                    .map(v -> v.getApartment().getId().equals(homeId)).orElse(false);
            default -> false;
        };
    }

    private boolean isStaff(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.ADMIN
                || role.getName() == RoleName.CONCIERGE);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(String entityType, Long entityId) {
        return attachmentRepository.findByEntityTypeAndEntityId(entityType, entityId).stream()
                .map(AttachmentResponse::from)
                .toList();
    }
}
