package com.sparklecow.citofonia.mail.repository;

import com.sparklecow.citofonia.mail.entity.Mailbox;
import com.sparklecow.citofonia.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repositorio de buzones (1-1 con usuario). */
@Repository
public interface MailboxRepository extends JpaRepository<Mailbox, Long> {

    Optional<Mailbox> findByUserId(Long userId);

    boolean existsByUser(User user);
}
