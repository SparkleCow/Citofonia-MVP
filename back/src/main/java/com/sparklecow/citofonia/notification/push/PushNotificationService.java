package com.sparklecow.citofonia.notification.push;

import com.sparklecow.citofonia.common.exception.BadRequestException;
import com.sparklecow.citofonia.config.PushProperties;
import com.sparklecow.citofonia.user.entity.User;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.json.JsonWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registro de tokens y envio de notificaciones push mediante el servicio de Expo.
 * Si {@code app.push.enabled=false} (por defecto) los tokens se guardan pero no se envia nada.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private static final Pattern EXPO_TOKEN = Pattern.compile("^Expo(nent)?PushToken\\[[A-Za-z0-9_\\-]+]$");
    private static final int BATCH = 100;

    private final PushTokenRepository pushTokenRepository;
    private final PushProperties pushProperties;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Transactional
    public void register(User user, String token, String platform) {
        if (token == null || !EXPO_TOKEN.matcher(token.trim()).matches()) {
            throw new BadRequestException("Token push no valido");
        }
        String value = token.trim();
        PushToken existing = pushTokenRepository.findByToken(value).orElse(null);
        if (existing == null) {
            pushTokenRepository.save(new PushToken(user, value, platform));
        } else {
            // El dispositivo pudo cambiar de cuenta: el token pasa al usuario actual.
            existing.setUser(user);
            existing.setPlatform(platform);
        }
    }

    @Transactional
    public void unregister(User user, String token) {
        if (token != null) {
            pushTokenRepository.deleteByTokenAndUserId(token.trim(), user.getId());
        }
    }

    /** Envio asincrono; nunca bloquea ni hace fallar la operacion que lo origina. */
    public void sendToEmails(Collection<String> emails, String title, String body, Map<String, Object> data) {
        if (!pushProperties.isEnabled() || emails.isEmpty()) {
            return;
        }
        List<String> tokens = pushTokenRepository.findTokensByUserEmails(emails);
        if (tokens.isEmpty()) {
            return;
        }
        Thread.ofVirtual().start(() -> {
            for (int i = 0; i < tokens.size(); i += BATCH) {
                List<Map<String, Object>> messages = new ArrayList<>();
                for (String token : tokens.subList(i, Math.min(i + BATCH, tokens.size()))) {
                    Map<String, Object> message = new LinkedHashMap<>();
                    message.put("to", token);
                    message.put("title", title);
                    message.put("body", body);
                    message.put("sound", "default");
                    message.put("priority", "high");
                    message.put("channelId", "emergencias");
                    message.put("data", data);
                    messages.add(message);
                }
                try {
                    HttpRequest request = HttpRequest.newBuilder(URI.create(pushProperties.url()))
                            .timeout(Duration.ofSeconds(10))
                            .header("Content-Type", "application/json")
                            .header("Accept", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(JsonWriter.standard().writeToString(messages)))
                            .build();
                    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                    log.info("Push enviado a {} dispositivo(s): HTTP {}", messages.size(), response.statusCode());
                } catch (Exception ex) {
                    log.warn("No se pudo enviar el push: {}", ex.getMessage());
                }
            }
        });
    }
}
