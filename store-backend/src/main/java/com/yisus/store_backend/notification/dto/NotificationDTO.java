package com.yisus.store_backend.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.yisus.store_backend.notification.model.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;
    private String title;
    private String message;
    private NotificationType type;
    @JsonProperty("isRead")
    private boolean isRead;
    private String link;
    private LocalDateTime createdAt;
}
