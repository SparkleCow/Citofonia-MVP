package com.sparklecow.citofonia.notification.push;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PushTokenRepository extends JpaRepository<PushToken, Long> {

    Optional<PushToken> findByToken(String token);

    @Query("SELECT p.token FROM PushToken p WHERE p.user.email IN :emails")
    List<String> findTokensByUserEmails(@Param("emails") Collection<String> emails);

    void deleteByTokenAndUserId(String token, Long userId);
}
