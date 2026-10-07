package com.yisus.store_backend.storeconfig.service.impl;

import com.yisus.store_backend.storeconfig.dto.StoreConfigBrandingDTO;
import com.yisus.store_backend.storeconfig.dto.StoreConfigDTO;
import com.yisus.store_backend.storeconfig.dto.StoreConfigUpdateDTO;
import com.yisus.store_backend.storeconfig.model.StoreConfig;
import com.yisus.store_backend.storeconfig.repository.StoreConfigRepository;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreConfigServiceImpl implements StoreConfigService {

    private final StoreConfigRepository storeConfigRepository;

    @Override
    @Transactional(readOnly = true)
    public StoreConfigDTO getConfig() {
        return toDTO(fetchSingleton());
    }

    @Override
    @Transactional(readOnly = true)
    public StoreConfig getRawConfig() {
        return fetchSingleton();
    }

    @Override
    @Transactional
    public StoreConfigDTO updateConfig(StoreConfigUpdateDTO dto) {
        StoreConfig config = fetchSingleton();
        config.setStoreName(dto.getStoreName().trim());
        config.setStoreRuc(dto.getStoreRuc() != null ? dto.getStoreRuc().trim() : null);
        config.setStoreAddress(dto.getStoreAddress() != null ? dto.getStoreAddress().trim() : null);
        config.setPrinterName(dto.getPrinterName() != null ? dto.getPrinterName().trim() : null);
        config.setPrinterIp(dto.getPrinterIp() != null ? dto.getPrinterIp().trim() : null);
        config.setPrinterPort(dto.getPrinterPort());
        config.setPrinterType(dto.getPrinterType() != null ? dto.getPrinterType().trim() : null);
        return toDTO(storeConfigRepository.save(config));
    }

    @Override
    @Transactional(readOnly = true)
    public StoreConfigBrandingDTO getBranding() {
        StoreConfig config = fetchSingleton();
        return StoreConfigBrandingDTO.builder()
                .storeName(config.getStoreName())
                .logoUrl(config.getLogoUrl())
                .build();
    }

    @Override
    @Transactional
    public StoreConfigDTO uploadLogo(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }

        StoreConfig config = fetchSingleton();

        try {
            Path uploadDir = Paths.get("uploads", "logos").toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            // Delete old logo if stored locally
            if (config.getLogoUrl() != null && config.getLogoUrl().startsWith("/uploads/logos/")) {
                Path oldFile = Paths.get(config.getLogoUrl().substring(1)).toAbsolutePath().normalize();
                Files.deleteIfExists(oldFile);
            }

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "logo";
            String extension = originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                    : ".png";
            String fileName = "store_logo_" + System.currentTimeMillis() + extension;
            Path filePath = uploadDir.resolve(fileName).normalize();

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            config.setLogoUrl("/uploads/logos/" + fileName);
            storeConfigRepository.save(config);
            log.info("Store logo uploaded: {}", fileName);
            return toDTO(config);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload logo: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public StoreConfigDTO deleteLogo() {
        StoreConfig config = fetchSingleton();

        if (config.getLogoUrl() != null && config.getLogoUrl().startsWith("/uploads/logos/")) {
            try {
                Path oldFile = Paths.get(config.getLogoUrl().substring(1)).toAbsolutePath().normalize();
                Files.deleteIfExists(oldFile);
            } catch (IOException e) {
                log.warn("Could not delete logo file: {}", e.getMessage());
            }
        }

        config.setLogoUrl(null);
        storeConfigRepository.save(config);
        log.info("Store logo deleted");
        return toDTO(config);
    }

    private StoreConfig fetchSingleton() {
        return storeConfigRepository.findById(StoreConfig.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Configuración de tienda no encontrada"));
    }

    private StoreConfigDTO toDTO(StoreConfig c) {
        return StoreConfigDTO.builder()
                .storeName(c.getStoreName())
                .storeRuc(c.getStoreRuc())
                .storeAddress(c.getStoreAddress())
                .logoUrl(c.getLogoUrl())
                .printerName(c.getPrinterName())
                .printerIp(c.getPrinterIp())
                .printerPort(c.getPrinterPort())
                .printerType(c.getPrinterType())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    @Override
    public void testPrinterConnection(String ip, int port) {
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress(ip, port), 3000);
            try (java.io.OutputStream out = socket.getOutputStream()) {
                out.write(new byte[]{0x1B, 0x40});
                out.flush();
            }
        } catch (Exception e) {
            log.warn("Error probando conexión a la impresora en {}:{}: {}", ip, port, e.getMessage());
            throw new RuntimeException("No se pudo establecer conexión con la ticketera en " + ip + ":" + port + ". Detalle: " + e.getMessage());
        }
    }
}
