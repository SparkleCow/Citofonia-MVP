package com.sparklecow.citofonia.attachment.repository;

import com.sparklecow.citofonia.attachment.entity.Attachment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
