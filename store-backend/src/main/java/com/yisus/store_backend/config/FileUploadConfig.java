package com.yisus.store_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import jakarta.servlet.MultipartConfigElement;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

@Configuration
public class FileUploadConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Los archivos subidos se nombran con timestamp único (avatar_1_<ts>.png,
        // store_logo_<ts>.png, etc.), así que al cambiarlos cambia la URL y se puede
        // cachear agresivamente sin riesgo de servir contenido obsoleto.
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + "/")
                .setCacheControl(
                        CacheControl
                                .maxAge(Duration.ofDays(30))
                                .cachePublic()
                                .mustRevalidate()
                );
    }

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
