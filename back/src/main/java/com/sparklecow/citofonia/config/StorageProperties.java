package com.sparklecow.citofonia.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(String uploadDir) {
    public Path getUploadPath() {
        if (uploadDir == null || uploadDir.isBlank()) {
            return Paths.get("uploads");
        }
        return Paths.get(uploadDir);
    }
}
