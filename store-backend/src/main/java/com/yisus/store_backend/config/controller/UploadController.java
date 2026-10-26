package com.yisus.store_backend.config.controller;

import com.yisus.store_backend.common.exception.ResourceNotFoundException;
import com.yisus.store_backend.local.service.LocalScope;
import com.yisus.store_backend.product.repository.ProductImageRepository;
import com.yisus.store_backend.storeconfig.repository.StoreConfigRepository;
import com.yisus.store_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@RestController
@RequiredArgsConstructor
public class UploadController {
    private final LocalScope localScope;
    private final UserRepository userRepository;
    private final ProductImageRepository productImageRepository;
    private final StoreConfigRepository storeConfigRepository;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @GetMapping("/uploads/{*filePath}")
    public ResponseEntity<Resource> getUpload(@PathVariable("filePath") String filePath) throws IOException {
        Long localId = localScope.id();
        String url = "/uploads/" + filePath.replaceFirst("^/", "");
        Path relativePath = Paths.get(filePath.replaceFirst("^/", ""));
        if (relativePath.isAbsolute() || relativePath.getNameCount() != 2) {
            throw new ResourceNotFoundException("File not found");
        }

        boolean belongsToLocal = userRepository.existsByAvatarUrlAndLocal_Id(url, localId)
                || productImageRepository.existsByUrlAndProductVariant_Product_Local_Id(url, localId)
                || storeConfigRepository.existsByLogoUrlAndLocal_Id(url, localId);
        if (!belongsToLocal) {
            throw new ResourceNotFoundException("File not found");
        }

        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path file = root.resolve(relativePath).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ResourceNotFoundException("File not found");
        }

        String contentType = Files.probeContentType(file);
        MediaType mediaType = contentType == null
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(contentType);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(Duration.ZERO).cachePrivate().mustRevalidate())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(file));
    }
}
