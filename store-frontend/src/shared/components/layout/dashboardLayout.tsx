'use client';

import { useState, useEffect } from "react";
import { Box, Drawer } from "@mui/material";
import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "./footer";
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, HEADER_HEIGHT } from "./constants";
import { ApiService } from "@/shared/services/api.service";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import { useNotificationsStore } from "@/store/notifications.store";
import {
    NotificationService,
    normalizeNotificationItem,
} from "@/features/notifications/services/notification.service";
import { useAuthStore } from "@/store/auth.store";
import { PERMISSIONS } from "@/shared/config/permissions";
import type { NotificationItem } from "@/features/notifications/types/notificationTypes";

interface BrandingDTO {
    storeName: string;
    logoUrl: string | null;
}

const SSE_RECONNECT_DELAY_MS = 5_000;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const setStoreConfig    = useStoreConfigStore((s) => s.setStoreConfig);
    const setUnreadCount    = useNotificationsStore((s) => s.setUnreadCount);
    const addIncoming       = useNotificationsStore((s) => s.addIncoming);
    const user              = useAuthStore((s) => s.user);
    const canNotifications  = useAuthStore((s) => s.hasPermission(PERMISSIONS.NOTIFICATIONS.READ));

    const sidebarWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

    // Load branding (store name + logo) once on mount
    useEffect(() => {
        ApiService.get<BrandingDTO>("/store-config/branding")
            .then((res) => {
                setStoreConfig({ storeName: res.data.storeName, logoUrl: res.data.logoUrl ?? null });
            })
            .catch(() => {});
    }, []);

    // Carga inicial del contador de no leídas (solo si el rol tiene permiso de notificaciones)
    useEffect(() => {
        if (!canNotifications) {
            setUnreadCount(0);
            return;
        }
        NotificationService.getUnreadCount()
            .then(setUnreadCount)
            .catch(() => {});
    }, [canNotifications, setUnreadCount]);

    // SSE: escucha notificaciones en tiempo real usando ticket efímero (no JWT en URL)
    useEffect(() => {
        if (!user || !canNotifications) return;

        let es: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let destroyed = false;

        const connect = async () => {
            if (destroyed) return;
            try {
                // 1. Pedir ticket efímero (30 s, un solo uso); sesión vía cookies httpOnly
                const res = await fetch(`/api/notifications/stream/ticket`, {
                    method: "POST",
                    credentials: "include",
                });
                if (!res.ok) return;
                const { ticket } = await res.json() as { ticket: string };

                if (destroyed) return;

                // 2. Conectar SSE con el ticket (UUID sin JWT en URL)
                es = new EventSource(`/api/notifications/stream?ticket=${encodeURIComponent(ticket)}`);

                es.addEventListener("notification", (e: MessageEvent) => {
                    try {
                        const raw = JSON.parse(e.data) as NotificationItem & { read?: boolean };
                        addIncoming(normalizeNotificationItem(raw));
                    } catch { /* ignorar JSON inválido */ }
                });

                es.onerror = () => {
                    es?.close();
                    if (!destroyed) {
                        reconnectTimer = setTimeout(connect, SSE_RECONNECT_DELAY_MS);
                    }
                };
            } catch {
                if (!destroyed) {
                    reconnectTimer = setTimeout(connect, SSE_RECONNECT_DELAY_MS);
                }
            }
        };

        connect();

        return () => {
            destroyed = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            es?.close();
        };
    }, [user, canNotifications]);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>

            {/* Sidebar mobile (temporal) */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", md: "none" },
                    "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
                }}
            >
                <Sidebar onMobileClose={() => setMobileOpen(false)} />
            </Drawer>

            {/* Sidebar desktop (permanente) */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", md: "flex" },
                    width: sidebarWidth,
                    flexShrink: 0,
                    transition: "width 0.2s ease",
                    "& .MuiDrawer-paper": {
                        width: sidebarWidth,
                        boxSizing: "border-box",
                        overflowX: "hidden",
                        transition: "width 0.2s ease",
                    },
                }}
                open
            >
                <Sidebar collapsed={collapsed} />
            </Drawer>

            {/* Área principal */}
            <Box
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    transition: "width 0.2s ease",
                    width: { md: `calc(100% - ${sidebarWidth}px)` },
                }}
            >
                <Header
                    onMenuClick={() => setMobileOpen((prev) => !prev)}
                    onToggleSidebar={() => setCollapsed((prev) => !prev)}
                    collapsed={collapsed}
                />

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: { xs: 2, sm: 3 },
                        mt: `${HEADER_HEIGHT}px`,
                    }}
                >
                    {children}
                </Box>

                <Footer />
            </Box>
        </Box>
    );
}
