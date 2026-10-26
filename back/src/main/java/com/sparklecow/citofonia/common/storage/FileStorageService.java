package com.sparklecow.citofonia.common.storage;

import com.sparklecow.citofonia.config.StorageProperties;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final StorageProperties storageProperties;
    private Path rootLocation;

    @PostConstruct
    public void init() {
        try {
            this.rootLocation = storageProperties.getUploadPath();
            Files.createDirectories(rootLocation);
            log.info("Almacenamiento local inicializado en {}", rootLocation.toAbsolutePath());
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo crear el directorio de uploads", e);
        }
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo no puede estar vacio");
        }
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        String filename = UUID.randomUUID().toString() + extension;
        String datePath = LocalDate.now().toString();
        Path targetDir = rootLocation.resolve(datePath);
        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(filename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
            String relativePath = Paths.get(datePath).resolve(filename).toString().replace("\\", "/");
            return new StoredFile(filename, originalFilename, relativePath, file.getContentType(),
                    file.getSize(), target);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar el archivo", e);
        }
    }

    public record StoredFile(String filename, String originalFilename, String relativePath,
                             String contentType, long size, Path absolutePath) {
    }
}
