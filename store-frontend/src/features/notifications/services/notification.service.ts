import { ApiService } from "@/shared/services/api.service";
import type { NotificationItem, NotificationPage } from "../types/notificationTypes";

/**
 * Jackson + Lombok a veces serializan `boolean isRead` como `read` en JSON.
 * Sin esto, `isRead` llega undefined y todo parece no leído.
 */
export function normalizeNotificationItem(
    raw: NotificationItem & { read?: boolean }
): NotificationItem {
    const r = raw as NotificationItem & { read?: boolean };
    return {
        ...r,
        isRead: r.isRead === true || r.read === true,
    };
}

function normalizePage(page: NotificationPage): NotificationPage {
    return {
        ...page,
        content: page.content.map((c) => normalizeNotificationItem(c)),
    };
}

export const NotificationService = {
    getRecent: async (): Promise<NotificationItem[]> => {
        const res = await ApiService.get<NotificationItem[]>("/notifications/recent");
        return res.data.map((n) => normalizeNotificationItem(n));
    },

    getAll: async (page = 0, size = 20, unreadOnly = false): Promise<NotificationPage> => {
        const res = await ApiService.get<NotificationPage>(
            `/notifications?page=${page}&size=${size}&unreadOnly=${unreadOnly}`
        );
        return normalizePage(res.data);
    },

    getUnreadCount: async (): Promise<number> => {
        const res = await ApiService.get<{ count: number }>("/notifications/unread-count");
        return res.data.count;
    },

    markAsRead: async (id: number): Promise<NotificationItem> => {
        const res = await ApiService.patch<NotificationItem>(`/notifications/${id}/read`);
        return normalizeNotificationItem(res.data);
    },

    markAllAsRead: async (): Promise<void> => {
        await ApiService.patch("/notifications/read-all");
    },

    deleteNotification: async (id: number): Promise<void> => {
        await ApiService.delete(`/notifications/${id}`);
    },
};
