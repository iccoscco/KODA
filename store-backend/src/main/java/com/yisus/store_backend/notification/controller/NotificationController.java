package com.yisus.store_backend.notification.controller;

import com.yisus.store_backend.notification.dto.NotificationDTO;
import com.yisus.store_backend.notification.service.NotificationService;
import com.yisus.store_backend.notification.sse.NotificationSseRegistry;
import com.yisus.store_backend.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Centro de notificaciones por usuario")
@SecurityRequirement(name = "Bearer Authentication")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseRegistry sseRegistry;

    /**
     * Genera un ticket de un solo uso (TTL 30s) para conectar el stream SSE sin
     * exponer el JWT en la URL.
     */
    @PostMapping("/stream/ticket")
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Obtener ticket efímero para conectar al stream SSE")
    public ResponseEntity<Map<String, String>> createStreamTicket(Authentication auth) {
        String ticket = sseRegistry.createTicket(userId(auth));
        return ResponseEntity.ok(Map.of("ticket", ticket));
    }

    /**
     * Conexión SSE. Autentica con el ticket de un solo uso obtenido en /stream/ticket.
     * El ticket expira en 30 s y se consume al primer uso.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "SSE stream de notificaciones en tiempo real (requiere ticket)")
    public ResponseEntity<SseEmitter> stream(@RequestParam String ticket) {
        Long userId = sseRegistry.consumeTicket(ticket);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(sseRegistry.subscribe(userId));
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Últimas 10 notificaciones para el dropdown del header")
    public ResponseEntity<List<NotificationDTO>> getRecent(Authentication auth) {
        return ResponseEntity.ok(notificationService.getRecent(userId(auth)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Lista paginada de notificaciones")
    public ResponseEntity<Page<NotificationDTO>> getAll(
            Authentication auth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return ResponseEntity.ok(notificationService.getAll(userId(auth), page, size, unreadOnly));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Cantidad de notificaciones no leídas")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId(auth))));
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Marcar una notificación como leída")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(notificationService.markAsRead(id, userId(auth)));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Marcar todas las notificaciones como leídas")
    public ResponseEntity<Void> markAllAsRead(Authentication auth) {
        notificationService.markAllAsRead(userId(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('notifications.read')")
    @Operation(summary = "Eliminar una notificación")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        notificationService.deleteNotification(id, userId(auth));
        return ResponseEntity.noContent().build();
    }

    private Long userId(Authentication auth) {
        return ((User) auth.getPrincipal()).getId();
    }
}
