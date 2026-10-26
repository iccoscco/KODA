package com.yisus.store_backend.notification.service;

import com.yisus.store_backend.notification.repository.NotificationRepository;
import com.yisus.store_backend.notification.service.impl.NotificationServiceImpl;
import com.yisus.store_backend.notification.sse.NotificationSseRegistry;
import com.yisus.store_backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationLocalScopeTest {
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final NotificationServiceImpl service =
            new NotificationServiceImpl(notifications, mock(UserRepository.class), mock(NotificationSseRegistry.class));

    @Test
    void notificationListAlwaysCombinesUserAndLocal() {
        when(notifications.findByUserIdAndLocal_IdOrderByCreatedAtDesc(eq(12L), eq(5L), any()))
                .thenReturn(Page.empty());

        service.getAll(12L, 5L, 0, 20, false);

        verify(notifications).findByUserIdAndLocal_IdOrderByCreatedAtDesc(eq(12L), eq(5L), any());
    }

    @Test
    void streamTicketIsBoundToUserAndLocalAndConsumedOnce() {
        NotificationSseRegistry registry = new NotificationSseRegistry();
        String ticket = registry.createTicket(12L, 5L);

        var identity = registry.consumeTicket(ticket);

        org.junit.jupiter.api.Assertions.assertEquals(12L, identity.userId());
        org.junit.jupiter.api.Assertions.assertEquals(5L, identity.localId());
        org.junit.jupiter.api.Assertions.assertNull(registry.consumeTicket(ticket));
    }
}
