package com.sparklecow.citofonia.attachment.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "attachments")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Attachment extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String originalFilename;

    @Column(nullable = false, length = 255)
    private String storedFilename;

    @Column(nullable = false, length = 512)
    private String relativePath;

    @Column(length = 128)
    private String contentType;

    private long size;

    @Column(length = 32)
    private String entityType;

    private Long entityId;

    @Column(length = 160)
    private String uploadedByEmail;

    public Attachment(String originalFilename, String storedFilename, String relativePath,
                      String contentType, long size, String entityType, Long entityId,
                      String uploadedByEmail) {
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.relativePath = relativePath;
        this.contentType = contentType;
        this.size = size;
        this.entityType = entityType;
        this.entityId = entityId;
        this.uploadedByEmail = uploadedByEmail;
    }
}
