package com.yisus.store_backend.notification.service.impl;

import com.yisus.store_backend.notification.dto.NotificationDTO;
import com.yisus.store_backend.notification.model.Notification;
import com.yisus.store_backend.notification.model.NotificationType;
import com.yisus.store_backend.notification.repository.NotificationRepository;
import com.yisus.store_backend.notification.service.NotificationService;
import com.yisus.store_backend.notification.sse.NotificationSseRegistry;
import com.yisus.store_backend.common.exception.ResourceNotFoundException;
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
    public List<NotificationDTO> getRecent(Long userId, Long localId) {
        return notificationRepository.findTop10ByUserIdAndLocal_IdOrderByCreatedAtDesc(userId, localId)
                .stream().map(this::toDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDTO> getAll(Long userId, Long localId, int page, int size, boolean unreadOnly) {
        PageRequest pageable = PageRequest.of(page, size);
        if (unreadOnly) {
            return notificationRepository
                    .findByUserIdAndLocal_IdAndIsReadFalseOrderByCreatedAtDesc(userId, localId, pageable)
                    .map(this::toDTO);
        }
        return notificationRepository
                .findByUserIdAndLocal_IdOrderByCreatedAtDesc(userId, localId, pageable)
                .map(this::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, Long localId) {
        return notificationRepository.countByUserIdAndLocal_IdAndIsReadFalse(userId, localId);
    }

    @Override
    @Transactional
    public NotificationDTO markAsRead(Long notificationId, Long userId, Long localId) {
        Notification notification = findOwned(notificationId, userId, localId);
        notification.setRead(true);
        return toDTO(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId, Long localId) {
        notificationRepository.markAllAsReadByUserIdAndLocalId(userId, localId);
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, Long userId, Long localId) {
        Notification notification = findOwned(notificationId, userId, localId);
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public NotificationDTO createForUser(Long userId, Long localId, String title, String message,
                                         NotificationType type, String link) {
        User user = userRepository.findByIdAndLocal_Id(userId, localId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Notification n = Notification.builder()
                .user(user)
                .local(user.getLocal())
                .title(title)
                .message(message)
                .type(type)
                .link(link)
                .build();
        NotificationDTO dto = toDTO(notificationRepository.save(n));
        sseRegistry.sendToUser(userId, localId, dto);
        return dto;
    }

    @Override
    @Transactional
    public void createForAllUsers(Long localId, String title, String message,
                                  NotificationType type, String link) {
        List<User> activeUsers = userRepository.findByLocal_IdAndIsActiveTrue(localId);
        List<Notification> notifications = activeUsers.stream()
                .map(u -> Notification.builder()
                        .user(u)
                        .local(u.getLocal())
                        .title(title)
                        .message(message)
                        .type(type)
                        .link(link)
                        .build())
                .toList();
        List<Notification> saved = notificationRepository.saveAll(notifications);
        // Emitir SSE individualmente por usuario para que cada cliente reciba su propio DTO con el id correcto
        for (Notification n : saved) {
            sseRegistry.sendToUser(n.getUser().getId(), localId, toDTO(n));
        }
    }

    @Override
    @Transactional
    public void createForUsersWithPermission(Long localId, String permissionName, String title, String message,
                                              NotificationType type, String link) {
        List<User> users = userRepository.findActiveByRolePermissionNameInLocal(permissionName, localId);
        if (users.isEmpty()) {
            log.warn("No active users with permission '{}'; skipping broadcast: {}", permissionName, title);
            return;
        }
        List<Notification> notifications = users.stream()
                .map(u -> Notification.builder()
                        .user(u)
                        .local(u.getLocal())
                        .title(title)
                        .message(message)
                        .type(type)
                        .link(link)
                        .build())
                .toList();
        List<Notification> saved = notificationRepository.saveAll(notifications);
        for (Notification n : saved) {
            sseRegistry.sendToUser(n.getUser().getId(), localId, toDTO(n));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private Notification findOwned(Long notificationId, Long userId, Long localId) {
        return notificationRepository.findByIdAndUserIdAndLocal_Id(notificationId, userId, localId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
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
