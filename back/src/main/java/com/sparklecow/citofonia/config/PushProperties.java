package com.sparklecow.citofonia.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Push via Expo Push Service. Desactivado por defecto: requiere un build de la app con
 * projectId de EAS y credenciales FCM/APNs configuradas en Expo.
 */
@ConfigurationProperties(prefix = "app.push")
public record PushProperties(Boolean enabled, String expoUrl) {

    public boolean isEnabled() {
        return Boolean.TRUE.equals(enabled);
    }

    public String url() {
        return expoUrl == null || expoUrl.isBlank() ? "https://exp.host/--/api/v2/push/send" : expoUrl;
    }
}
