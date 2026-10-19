package com.sparklecow.citofonia.mail.repository;

import com.sparklecow.citofonia.mail.entity.MailboxMessage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repositorio de recepciones de mensaje por buzon. */
@Repository
public interface MailboxMessageRepository extends JpaRepository<MailboxMessage, Long> {

    List<MailboxMessage> findByMailboxIdOrderByCreatedAtDesc(Long mailboxId);

    Optional<MailboxMessage> findByIdAndMailboxUserId(Long id, Long userId);

    @Query("SELECT COUNT(m) FROM MailboxMessage m WHERE m.mailbox.user.id = :userId AND m.read = false")
    long countUnreadByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM MailboxMessage m WHERE m.mailbox.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
}
