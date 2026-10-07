export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

export interface NotificationItem {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    link: string | null;
    createdAt: string;
}

export interface NotificationPage {
    content: NotificationItem[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}
