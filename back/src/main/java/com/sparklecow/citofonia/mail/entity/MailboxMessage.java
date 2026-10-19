package com.sparklecow.citofonia.mail.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Recepcion de un mensaje en el buzon de un usuario: una fila por
 * destinatario con su propio estado de lectura.
 */
@Entity
@Table(name = "mailbox_messages",
        uniqueConstraints = @UniqueConstraint(columnNames = {"mailbox_id", "message_id"}))
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MailboxMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "mailbox_id", nullable = false)
    private Mailbox mailbox;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private MailMessage message;

    @Column(nullable = false)
    private boolean read;

    private Instant readAt;

    public MailboxMessage(Mailbox mailbox, MailMessage message) {
        this.mailbox = mailbox;
        this.message = message;
    }
}
