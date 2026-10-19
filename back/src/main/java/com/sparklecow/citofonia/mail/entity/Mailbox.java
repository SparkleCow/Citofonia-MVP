package com.sparklecow.citofonia.mail.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import com.sparklecow.citofonia.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Buzon de mensajes de un usuario. Relacion 1-1 con {@link User}: cada
 * cuenta tiene un unico buzon donde aterrizan los mensajes que recibe.
 */
@Entity
@Table(name = "mailboxes")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Mailbox extends BaseEntity {

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    public Mailbox(User user) {
        this.user = user;
    }
}
