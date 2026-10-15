package com.sparklecow.citofonia.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.sparklecow.citofonia.user.entity.User;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

/**
 * Servicio de emision y validacion de tokens JWT (HS256).
 */
@Slf4j
@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final MacAlgorithm SIGNATURE_ALGORITHM = MacAlgorithm.HS256;

    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        byte[] keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("El secreto JWT debe tener al menos 32 bytes");
        }
        SecretKey key = new SecretKeySpec(keyBytes, HMAC_ALGORITHM);
        this.jwtEncoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.jwtDecoder = NimbusJwtDecoder.withSecretKey(key)
                .macAlgorithm(SIGNATURE_ALGORITHM)
                .build();
    }

    /**
     * Genera un token firmado para el usuario autenticado.
     */
    public String generateToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getEmail())
                .issuedAt(now)
                .expiresAt(now.plus(properties.expiration()))
                .claim("roles", user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .toList())
                .build();
        JwsHeader header = JwsHeader.with(SIGNATURE_ALGORITHM).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /**
     * Decodifica y valida la firma y expiracion del token.
     *
     * @throws org.springframework.security.oauth2.jwt.JwtException si el token
     *         es invalido, expirado o la firma no coincide.
     */
    public Jwt decode(String token) {
        return jwtDecoder.decode(token);
    }
}
