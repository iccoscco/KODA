package com.yisus.store_backend.notification.service;

import com.yisus.store_backend.notification.dto.NotificationDTO;
import com.yisus.store_backend.notification.model.NotificationType;
import org.springframework.data.domain.Page;

import java.util.List;

public interface NotificationService {

    /** Últimas 10 notificaciones del usuario (para el dropdown del header). */
    List<NotificationDTO> getRecent(Long userId);

    /** Lista paginada; unreadOnly filtra solo las no leídas. */
    Page<NotificationDTO> getAll(Long userId, int page, int size, boolean unreadOnly);

    /** Cantidad de notificaciones no leídas. */
    long getUnreadCount(Long userId);

    /** Marcar una notificación como leída. */
    NotificationDTO markAsRead(Long notificationId, Long userId);

    /** Marcar todas como leídas. */
    void markAllAsRead(Long userId);

    /** Eliminar una notificación. */
    void deleteNotification(Long notificationId, Long userId);

    // ── Creación interna ────────────────────────────────────────────────────

    /** Crear una notificación para un usuario específico. */
    NotificationDTO createForUser(Long userId, String title, String message, NotificationType type, String link);

    /** Crear una notificación para todos los usuarios activos. */
    void createForAllUsers(String title, String message, NotificationType type, String link);

    /** Crear la misma notificación para todos los usuarios activos que tengan el permiso (p. ej. {@code notifications.read}). */
    void createForUsersWithPermission(String permissionName, String title, String message, NotificationType type, String link);
}
