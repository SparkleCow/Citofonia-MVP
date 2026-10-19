package com.sparklecow.citofonia.mail.repository;

import com.sparklecow.citofonia.mail.entity.MailMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repositorio de mensajes enviados. */
@Repository
public interface MailMessageRepository extends JpaRepository<MailMessage, Long> {
}
