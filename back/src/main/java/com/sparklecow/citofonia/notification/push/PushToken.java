package com.sparklecow.citofonia.notification.push;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import com.sparklecow.citofonia.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Token push de un dispositivo (tabla nueva). Un usuario puede tener varios dispositivos. */
@Entity
@Table(name = "push_tokens")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PushToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 200)
    private String token;

    @Column(length = 16)
    private String platform;

    public PushToken(User user, String token, String platform) {
        this.user = user;
        this.token = token;
        this.platform = platform;
    }
}
