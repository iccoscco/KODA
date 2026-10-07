package com.yisus.store_backend.notification.service.impl;

import com.yisus.store_backend.notification.dto.NotificationDTO;
import com.yisus.store_backend.notification.model.Notification;
import com.yisus.store_backend.notification.model.NotificationType;
import com.yisus.store_backend.notification.repository.NotificationRepository;
import com.yisus.store_backend.notification.service.NotificationService;
import com.yisus.store_backend.notification.sse.NotificationSseRegistry;
import com.yisus.store_backend.user.model.User;
import com.yisus.store_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationSseRegistry sseRegistry;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDTO> getRecent(Long userId) {
        return notificationRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDTO> getAll(Long userId, int page, int size, boolean unreadOnly) {
        PageRequest pageable = PageRequest.of(page, size);
        if (unreadOnly) {
            return notificationRepository
                    .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable)
                    .map(this::toDTO);
        }
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public NotificationDTO markAsRead(Long notificationId, Long userId) {
        Notification notification = findOwned(notificationId, userId);
        notification.setRead(true);
        return toDTO(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = findOwned(notificationId, userId);
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public NotificationDTO createForUser(Long userId, String title, String message, NotificationType type, String link) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        Notification n = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .link(link)
                .build();
        NotificationDTO dto = toDTO(notificationRepository.save(n));
        sseRegistry.sendToUser(userId, dto);
        return dto;
    }

    @Override
    @Transactional
    public void createForAllUsers(String title, String message, NotificationType type, String link) {
        List<User> activeUsers = userRepository.findByIsActiveTrue();
        List<Notification> notifications = activeUsers.stream()
                .map(u -> Notification.builder()
                        .user(u)
                        .title(title)
                        .message(message)
                        .type(type)
                        .link(link)
                        .build())
                .toList();
        List<Notification> saved = notificationRepository.saveAll(notifications);
        // Emitir SSE individualmente por usuario para que cada cliente reciba su propio DTO con el id correcto
        for (Notification n : saved) {
            sseRegistry.sendToUser(n.getUser().getId(), toDTO(n));
        }
    }

    @Override
    @Transactional
    public void createForUsersWithPermission(String permissionName, String title, String message, NotificationType type, String link) {
        List<User> users = userRepository.findActiveByRolePermissionName(permissionName);
        if (users.isEmpty()) {
            log.warn("No active users with permission '{}'; skipping broadcast: {}", permissionName, title);
            return;
        }
        List<Notification> notifications = users.stream()
                .map(u -> Notification.builder()
                        .user(u)
                        .title(title)
                        .message(message)
                        .type(type)
                        .link(link)
                        .build())
                .toList();
        List<Notification> saved = notificationRepository.saveAll(notifications);
        for (Notification n : saved) {
            sseRegistry.sendToUser(n.getUser().getId(), toDTO(n));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Notification findOwned(Long notificationId, Long userId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        if (!n.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied to notification: " + notificationId);
        }
        return n;
    }

    private NotificationDTO toDTO(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .isRead(n.isRead())
                .link(n.getLink())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
