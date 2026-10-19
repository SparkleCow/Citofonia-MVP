package com.sparklecow.citofonia.mail.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mensaje enviado por administracion (comunicado general o dirigido).
 * El contenido se guarda una sola vez; cada destinatario tiene su propia
 * copia de recepcion en {@link MailboxMessage} con su estado de lectura.
 */
@Entity
@Table(name = "mail_messages")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MailMessage extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String subject;

    @Column(nullable = false, length = 4000)
    private String body;

    /** Email del administrador que envio el mensaje. */
    @Column(nullable = false, length = 160)
    private String senderEmail;

    /** Audiencia original: ALL, RESIDENTS, SECURITY o CUSTOM. */
    @Column(length = 20)
    private String audience;

    public MailMessage(String subject, String body, String senderEmail, String audience) {
        this.subject = subject;
        this.body = body;
        this.senderEmail = senderEmail;
        this.audience = audience;
    }
}
