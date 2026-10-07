package com.yisus.store_backend.notification.dto;

import com.yisus.store_backend.notification.model.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateNotificationDTO {
    @NotBlank
    private String title;

    @NotBlank
    private String message;

    @NotNull
    private NotificationType type;

    /** null = enviar a todos los usuarios activos */
    private Long userId;

    /** Ruta opcional de navegación */
    private String link;
}
