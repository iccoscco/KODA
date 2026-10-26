package com.yisus.store_backend.config;

import org.springframework.context.annotation.Configuration;
import jakarta.servlet.MultipartConfigElement;
import org.springframework.context.annotation.Bean;

@Configuration
public class FileUploadConfig {

    /**
     * Configura el límite de tamaño de uploads directamente en el contenedor Jakarta Servlet.
     * Parámetros: location, maxFileSize (bytes), maxRequestSize (bytes), fileSizeThreshold.
     * -1 = sin límite, 0 en threshold = todo en memoria.
     */
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        return new MultipartConfigElement("", 52_428_800L, 52_428_800L, 0);
    }
}
