'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    AppBar,
    Badge,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Popover,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import ThemeToggle from "@/shared/components/themeToggle";
import UserMenu from "./userMenu";
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, HEADER_HEIGHT } from "./constants";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { PERMISSIONS } from "@/shared/config/permissions";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import { NotificationService } from "@/features/notifications/services/notification.service";
import type { NotificationItem, NotificationType } from "@/features/notifications/types/notificationTypes";
import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store/auth.store";
import { parseBackendDate } from "@/shared/utils/dateFormat";

// ── helpers ──────────────────────────────────────────────────────────────────

function typeColor(type: NotificationType): string {
    switch (type) {
        case "INFO":    return "#2196f3";
        case "WARNING": return "#ff9800";
        case "ALERT":   return "#f44336";
        case "SUCCESS": return "#4caf50";
    }
}

function TypeIcon({ type }: { type: NotificationType }) {
    const sx = { fontSize: 18, color: typeColor(type) };
    switch (type) {
        case "INFO":    return <InfoRoundedIcon sx={sx} />;
        case "WARNING": return <WarningRoundedIcon sx={sx} />;
        case "ALERT":   return <ErrorRoundedIcon sx={sx} />;
        case "SUCCESS": return <CheckCircleRoundedIcon sx={sx} />;
    }
}

function timeAgo(dateStr: string): string {
    try {
        const d = parseBackendDate(dateStr);
        if (!d) return dateStr;
        return formatDistanceToNow(d, { addSuffix: true, locale: es });
    } catch {
        return dateStr;
    }
}

// ── props ─────────────────────────────────────────────────────────────────────

interface HeaderProps {
    onMenuClick: () => void;
    onToggleSidebar: () => void;
    collapsed: boolean;
}

// ── componente ────────────────────────────────────────────────────────────────

export default function Header({ onMenuClick, onToggleSidebar, collapsed }: HeaderProps) {
    const router = useRouter();
    const sidebarWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

    const storeName = useStoreConfigStore((s) => s.storeName);
    const logoUrl   = useStoreConfigStore((s) => s.logoUrl);
    const logoSrc   = toMediaUrl(logoUrl) || null;

    const unreadCount        = useNotificationsStore((s) => s.unreadCount);
    const recent             = useNotificationsStore((s) => s.recent);
    const setRecent          = useNotificationsStore((s) => s.setRecent);
    const markReadLocally    = useNotificationsStore((s) => s.markReadLocally);
    const markAllReadLocally = useNotificationsStore((s) => s.markAllReadLocally);
    const setUnreadCount     = useNotificationsStore((s) => s.setUnreadCount);

    const canNotifications = useAuthStore((s) => s.hasPermission(PERMISSIONS.NOTIFICATIONS.READ));

    const [anchorEl, setAnchorEl]   = useState<HTMLButtonElement | null>(null);
    const [loading, setLoading]     = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const bellRef = useRef<HTMLButtonElement>(null);

    const open = Boolean(anchorEl);

    const handleBellClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
        setLoading(true);
        try {
            const [data, count] = await Promise.all([
                NotificationService.getRecent(),
                NotificationService.getUnreadCount(),
            ]);
            setRecent(data);
            setUnreadCount(count);
        } catch { /* silencio */ }
        finally { setLoading(false); }
    };

    const handleClose = () => setAnchorEl(null);

    const handleClickNotification = async (n: NotificationItem) => {
        // Marcar como leída si no lo está
        if (!n.isRead) {
            try {
                await NotificationService.markAsRead(n.id);
                markReadLocally(n.id);
            } catch { /* silencio */ }
        }
        handleClose();
        if (n.link) {
            router.push(n.link);
        } else {
            router.push("/notifications");
        }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        try {
            await NotificationService.markAllAsRead();
            markAllReadLocally();
            setUnreadCount(0);
        } catch { /* silencio */ }
        finally { setMarkingAll(false); }
    };

    const handleViewAll = () => {
        handleClose();
        router.push("/notifications");
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                height: HEADER_HEIGHT,
                width: { md: `calc(100% - ${sidebarWidth}px)` },
                ml: { md: `${sidebarWidth}px` },
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                color: "text.primary",
                transition: "width 0.2s ease, margin-left 0.2s ease",
            }}
        >
            <Toolbar sx={{ height: "100%", gap: 1 }}>

                {/* Hamburger — solo mobile */}
                <IconButton onClick={onMenuClick} edge="start" sx={{ display: { md: "none" } }}>
                    <MenuRoundedIcon />
                </IconButton>

                {/* Colapsar/expandir sidebar — solo desktop */}
                <IconButton onClick={onToggleSidebar} sx={{ display: { xs: "none", md: "flex" } }}>
                    {collapsed ? <MenuRoundedIcon /> : <MenuOpenRoundedIcon />}
                </IconButton>

                {/* Logo + store name — solo mobile */}
                <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1, flexGrow: 1, minWidth: 0 }}>
                    {logoSrc ? (
                        <Tooltip title={storeName?.trim() || "Mi tienda"} arrow>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
                                <Box sx={{ position: "relative", width: 40, height: 40, flexShrink: 0, borderRadius: 1, overflow: "hidden" }}>
                                    <Image src={logoSrc} alt={storeName || "Logo"} fill style={{ objectFit: "contain" }} unoptimized priority />
                                </Box>
                                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                    Panel de administración
                                </Typography>
                            </Box>
                        </Tooltip>
                    ) : (
                        <>
                            <StorefrontRoundedIcon fontSize="small" color="primary" />
                            <Tooltip title={storeName || "Mi Tienda"} arrow>
                                <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                    {storeName || "Mi Tienda"}
                                </Typography>
                            </Tooltip>
                        </>
                    )}
                </Box>

                {/* Spacer — solo desktop */}
                <Box sx={{ flexGrow: 1, display: { xs: "none", md: "block" } }} />

                {/* Acciones */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {canNotifications && (
                    <Tooltip title="Notificaciones">
                        <IconButton ref={bellRef} onClick={handleBellClick}>
                            <Badge badgeContent={unreadCount > 99 ? "99+" : unreadCount} color="error" max={99}>
                                {unreadCount > 0
                                    ? <NotificationsRoundedIcon />
                                    : <NotificationsNoneRoundedIcon />
                                }
                            </Badge>
                        </IconButton>
                    </Tooltip>
                    )}

                    <ThemeToggle />
                    <UserMenu />
                </Box>
            </Toolbar>

            {/* ── Popover de notificaciones ── */}
            {canNotifications && (
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        sx: {
                            width: 380,
                            maxHeight: 520,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            mt: 1,
                            borderRadius: 2,
                            boxShadow: 6,
                        },
                    },
                }}
            >
                {/* Cabecera del popover */}
                <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Notificaciones
                        </Typography>
                        {unreadCount > 0 && (
                            <Chip label={unreadCount} size="small" color="error" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                        )}
                    </Box>
                    {unreadCount > 0 && (
                        <Tooltip title="Marcar todas como leídas">
                            <IconButton size="small" onClick={handleMarkAll} disabled={markingAll}>
                                {markingAll
                                    ? <CircularProgress size={16} color="inherit" />
                                    : <DoneAllRoundedIcon fontSize="small" />
                                }
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Divider />

                {/* Lista de notificaciones */}
                <Box sx={{ overflowY: "auto", flexGrow: 1 }}>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : recent.length === 0 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, gap: 1.5, color: "text.disabled" }}>
                            <NotificationsNoneRoundedIcon sx={{ fontSize: 48 }} />
                            <Typography variant="body2">Sin notificaciones</Typography>
                        </Box>
                    ) : (
                        recent.map((n, idx) => (
                            <Box key={n.id}>
                                {idx > 0 && <Divider />}
                                <Box
                                    onClick={() => handleClickNotification(n)}
                                    sx={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 1.5,
                                        px: 2,
                                        py: 1.5,
                                        cursor: "pointer",
                                        bgcolor: n.isRead ? "transparent" : alpha(typeColor(n.type), 0.05),
                                        transition: "background-color 0.15s",
                                        "&:hover": { bgcolor: "action.hover" },
                                        position: "relative",
                                    }}
                                >
                                    {/* No leído: punto · Leído: check verde */}
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            left: 6,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {n.isRead ? (
                                            <DoneRoundedIcon sx={{ fontSize: 12, color: "success.main" }} />
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: "50%",
                                                    bgcolor: typeColor(n.type),
                                                }}
                                            />
                                        )}
                                    </Box>

                                    {/* Ícono */}
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 1.5,
                                            bgcolor: alpha(typeColor(n.type), 0.12),
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            mt: 0.2,
                                        }}
                                    >
                                        <TypeIcon type={n.type} />
                                    </Box>

                                    {/* Texto */}
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={n.isRead ? 400 : 700}
                                            noWrap
                                            sx={{ mb: 0.2 }}
                                        >
                                            {n.title}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                mb: 0.3,
                                            }}
                                        >
                                            {n.message}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">
                                            {timeAgo(n.createdAt)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        ))
                    )}
                </Box>

                {/* Footer del popover */}
                <Divider />
                <Box sx={{ p: 1.5 }}>
                    <Button fullWidth size="small" onClick={handleViewAll}>
                        Ver todas las notificaciones
                    </Button>
                </Box>
            </Popover>
            )}
        </AppBar>
    );
}
