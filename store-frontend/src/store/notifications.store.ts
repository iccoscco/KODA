import { create } from "zustand";
import type { NotificationItem } from "@/features/notifications/types/notificationTypes";

interface NotificationsState {
    unreadCount: number;
    recent: NotificationItem[];
    setUnreadCount: (count: number) => void;
    setRecent: (notifications: NotificationItem[]) => void;
    /** Inserta una nueva notificación recibida por SSE al principio de la lista. */
    addIncoming: (notification: NotificationItem) => void;
    /** Marca una notificación como leída en el store local. */
    markReadLocally: (id: number) => void;
    /** Marca todas como leídas en el store local. */
    markAllReadLocally: () => void;
    /** Elimina una notificación del store local. `wasUnread` si no está en `recent` (p. ej. lista completa). */
    removeLocally: (id: number, opts?: { wasUnread?: boolean }) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
    unreadCount: 0,
    recent: [],

    setUnreadCount: (count) => set({ unreadCount: count }),

    /** Solo actualiza la lista del dropdown; el contador global viene de GET /unread-count. */
    setRecent: (notifications) =>
        set({
            recent: notifications,
        }),

    addIncoming: (notification) =>
        set((state) => ({
            recent: [notification, ...state.recent].slice(0, 10),
            unreadCount: state.unreadCount + 1,
        })),

    markReadLocally: (id) =>
        set((state) => {
            const inRecent = state.recent.find((n) => n.id === id);
            // En el dropdown: solo baja si estaba no leída. Fuera de `recent` (p. ej. /notifications): asumimos no leída.
            const delta =
                inRecent && !inRecent.isRead ? 1 : inRecent ? 0 : 1;
            return {
                recent: state.recent.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
                unreadCount: Math.max(0, state.unreadCount - delta),
            };
        }),

    markAllReadLocally: () =>
        set((state) => ({
            recent: state.recent.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
        })),

    removeLocally: (id, opts) =>
        set((state) => {
            const removed = state.recent.find((n) => n.id === id);
            let delta = 0;
            if (removed) {
                delta = removed.isRead ? 0 : 1;
            } else if (opts?.wasUnread === true) {
                delta = 1;
            } else if (opts?.wasUnread === false) {
                delta = 0;
            }
            return {
                recent: state.recent.filter((n) => n.id !== id),
                unreadCount: Math.max(0, state.unreadCount - delta),
            };
        }),
}));
