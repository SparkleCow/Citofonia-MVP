package com.sparklecow.citofonia.attachment.dto;

import com.sparklecow.citofonia.attachment.entity.Attachment;

public record AttachmentResponse(Long id, String originalFilename, String contentType, long size,
                                 String relativePath, String entityType, Long entityId) {
    public static AttachmentResponse from(Attachment attachment) {
        return new AttachmentResponse(
                attachment.getId(),
                attachment.getOriginalFilename(),
                attachment.getContentType(),
                attachment.getSize(),
                attachment.getRelativePath(),
                attachment.getEntityType(),
                attachment.getEntityId()
        );
    }
}
