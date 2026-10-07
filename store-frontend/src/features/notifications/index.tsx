'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Pagination,
    Paper,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { NotificationService } from "./services/notification.service";
import { useNotificationsStore } from "@/store/notifications.store";
import type { NotificationItem, NotificationType } from "./types/notificationTypes";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import InlineLoading from "@/shared/components/InlineLoading";
import { parseBackendDate } from "@/shared/utils/dateFormat";

// ── helpers ─────────────────────────────────────────────────────────────────

function typeColor(type: NotificationType): string {
    switch (type) {
        case "INFO":    return "#2196f3";
        case "WARNING": return "#ff9800";
        case "ALERT":   return "#f44336";
        case "SUCCESS": return "#4caf50";
    }
}

function TypeIcon({ type }: { type: NotificationType }) {
    const color = typeColor(type);
    const props = { sx: { color, fontSize: 22 } };
    switch (type) {
        case "INFO":    return <InfoRoundedIcon {...props} />;
        case "WARNING": return <WarningRoundedIcon {...props} />;
        case "ALERT":   return <ErrorRoundedIcon {...props} />;
        case "SUCCESS": return <CheckCircleRoundedIcon {...props} />;
    }
}

function typeLabel(type: NotificationType): string {
    switch (type) {
        case "INFO":    return "Info";
        case "WARNING": return "Aviso";
        case "ALERT":   return "Alerta";
        case "SUCCESS": return "Éxito";
    }
}

function linkLabel(link: string): string {
    if (link.includes("/products")) return "Ver producto";
    if (link.includes("/cash"))     return "Ver caja";
    if (link.includes("/orders"))   return "Ver pedido";
    return "Ver más";
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

// ── componente principal ─────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function Notifications() {
    const router = useRouter();
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down("sm"), { defaultMatches: true });

    const markReadLocally = useNotificationsStore((s) => s.markReadLocally);
    const markAllReadLocally = useNotificationsStore((s) => s.markAllReadLocally);
    const removeLocally = useNotificationsStore((s) => s.removeLocally);
    const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [totalPages, setTotalPages]         = useState(0);
    const [totalElements, setTotalElements]   = useState(0);
    const [page, setPage]                     = useState(1);
    const [unreadOnly, setUnreadOnly]         = useState(false);
    /** `true` al montar evita un frame de “vacío” antes del primer fetch. */
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState<string | null>(null);
    const [markingAll, setMarkingAll]         = useState(false);

    const unreadCount = useNotificationsStore((s) => s.unreadCount);

    const fetchPage = useCallback(async (p: number, unread: boolean) => {
        setLoading(true);
        setError(null);
        try {
            const data = await NotificationService.getAll(p - 1, PAGE_SIZE, unread);
            setNotifications(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
            const count = await NotificationService.getUnreadCount();
            setUnreadCount(count);
        } catch {
            setError("No se pudieron cargar las notificaciones");
        } finally {
            setLoading(false);
        }
    }, [setUnreadCount]);

    useEffect(() => {
        fetchPage(page, unreadOnly);
    }, [page, unreadOnly]);

    const handleFilterChange = (unread: boolean) => {
        setUnreadOnly(unread);
        setPage(1);
    };

    // Click en la fila: solo marca como leída, no navega
    const handleRowClick = async (n: NotificationItem) => {
        if (n.isRead) return;
        try {
            await NotificationService.markAsRead(n.id);
            markReadLocally(n.id);
            setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
        } catch { /* silencio */ }
    };

    // Botón "Ver producto / Ver más": navega al link
    const handleNavigateLink = async (e: React.MouseEvent, n: NotificationItem) => {
        e.stopPropagation();
        if (!n.link) return;
        // Marcar como leída antes de navegar si no lo estaba
        if (!n.isRead) {
            try {
                await NotificationService.markAsRead(n.id);
                markReadLocally(n.id);
                setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
            } catch { /* silencio */ }
        }
        router.push(n.link);
    };

    const handleDelete = async (e: React.MouseEvent, n: NotificationItem) => {
        e.stopPropagation();
        try {
            await NotificationService.deleteNotification(n.id);
            removeLocally(n.id, { wasUnread: !n.isRead });
            setNotifications((prev) => prev.filter((item) => item.id !== n.id));
            setTotalElements((v) => v - 1);
        } catch { /* silencio */ }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        try {
            await NotificationService.markAllAsRead();
            markAllReadLocally();
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch { /* silencio */ }
        finally { setMarkingAll(false); }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* ── Header ─────────────────────────────────── */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <NotificationsRoundedIcon color="primary" sx={{ flexShrink: 0 }} />
                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        Notificaciones
                    </Typography>
                    {unreadCount > 0 && (
                        <Chip
                            label={unreadCount}
                            size="small"
                            color="error"
                            sx={{ fontWeight: 700, height: 22, fontSize: 12, flexShrink: 0 }}
                        />
                    )}
                </Box>

                <Button
                    size="small"
                    variant="outlined"
                    fullWidth={isNarrow}
                    startIcon={markingAll ? <CircularProgress size={14} color="inherit" /> : <DoneAllRoundedIcon fontSize="small" />}
                    onClick={handleMarkAll}
                    disabled={markingAll || unreadCount === 0}
                    sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "auto" } }}
                >
                    Marcar todas como leídas
                </Button>
            </Box>

            {/* ── Filtros ────────────────────────────────── */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip
                    label="Todas"
                    clickable
                    onClick={() => handleFilterChange(false)}
                    color={!unreadOnly ? "primary" : "default"}
                    variant={!unreadOnly ? "filled" : "outlined"}
                />
                <Chip
                    label="No leídas"
                    clickable
                    onClick={() => handleFilterChange(true)}
                    color={unreadOnly ? "primary" : "default"}
                    variant={unreadOnly ? "filled" : "outlined"}
                    icon={<NotificationsRoundedIcon fontSize="small" />}
                />
            </Box>

            {/* ── Lista ──────────────────────────────────── */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
                    <InlineLoading />
                </Paper>
            ) : notifications.length === 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 10, gap: 2, color: "text.disabled" }}>
                    <NotificationsNoneRoundedIcon sx={{ fontSize: 64 }} />
                    <Typography variant="body1">
                        {unreadOnly ? "No tienes notificaciones sin leer" : "No hay notificaciones"}
                    </Typography>
                </Box>
            ) : (
                <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
                    {notifications.map((n, idx) => (
                        <Box key={n.id}>
                            {idx > 0 && <Divider />}
                            <Box
                                onClick={() => handleRowClick(n)}
                                sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: { xs: 1.25, sm: 2 },
                                    pl: { xs: 2, sm: 3 },
                                    pr: { xs: 1, sm: 2 },
                                    py: { xs: 1.5, sm: 2 },
                                    cursor: n.isRead ? "default" : "pointer",
                                    bgcolor: n.isRead ? "transparent" : alpha(typeColor(n.type), 0.05),
                                    transition: "background-color 0.15s",
                                    "&:hover": { bgcolor: "action.hover" },
                                    position: "relative",
                                    opacity: n.isRead ? 0.6 : 1,
                                }}
                            >
                                {/* Indicador izquierdo: punto azul = no leído | check verde = leído */}
                                <Box sx={{
                                    position: "absolute",
                                    left: { xs: 8, sm: 10 },
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                    {n.isRead ? (
                                        <DoneRoundedIcon sx={{ fontSize: 14, color: "success.main" }} />
                                    ) : (
                                        <Box sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            bgcolor: typeColor(n.type),
                                        }} />
                                    )}
                                </Box>

                                {/* Ícono de tipo */}
                                <Box sx={{
                                    width: { xs: 38, sm: 42 },
                                    height: { xs: 38, sm: 42 },
                                    borderRadius: 2,
                                    bgcolor: alpha(typeColor(n.type), n.isRead ? 0.06 : 0.12),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    mt: 0.2,
                                }}>
                                    <TypeIcon type={n.type} />
                                </Box>

                                {/* Contenido */}
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    {/* Título + badge tipo + badge leído */}
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4, flexWrap: "wrap" }}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={n.isRead ? 400 : 700}
                                            color={n.isRead ? "text.secondary" : "text.primary"}
                                            sx={{ wordBreak: "break-word", overflowWrap: "anywhere", minWidth: 0 }}
                                        >
                                            {n.title}
                                        </Typography>
                                        <Chip
                                            label={typeLabel(n.type)}
                                            size="small"
                                            sx={{
                                                height: 18,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                bgcolor: alpha(typeColor(n.type), 0.12),
                                                color: typeColor(n.type),
                                            }}
                                        />
                                        {n.isRead && (
                                            <Chip
                                                label="Leída"
                                                size="small"
                                                sx={{
                                                    height: 18,
                                                    fontSize: 10,
                                                    fontWeight: 500,
                                                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                                                    color: "success.main",
                                                }}
                                            />
                                        )}
                                    </Box>

                                    {/* Mensaje completo */}
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 0.8, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}
                                    >
                                        {n.message}
                                    </Typography>

                                    {/* Footer: tiempo + botón de acción */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: { xs: "stretch", sm: "center" },
                                            flexDirection: { xs: "column", sm: "row" },
                                            gap: { xs: 1, sm: 2 },
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                                            {timeAgo(n.createdAt)}
                                        </Typography>
                                        {n.link && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                fullWidth={isNarrow}
                                                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />}
                                                onClick={(e) => handleNavigateLink(e, n)}
                                                sx={{
                                                    height: { xs: 32, sm: 24 },
                                                    fontSize: 11,
                                                    px: 1.2,
                                                    alignSelf: { xs: "stretch", sm: "center" },
                                                    maxWidth: { xs: "100%", sm: "none" },
                                                    borderColor: typeColor(n.type),
                                                    color: typeColor(n.type),
                                                    "&:hover": {
                                                        bgcolor: alpha(typeColor(n.type), 0.08),
                                                        borderColor: typeColor(n.type),
                                                    },
                                                }}
                                            >
                                                {linkLabel(n.link)}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>

                                {/* Botón eliminar */}
                                <Tooltip title="Eliminar">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDelete(e, n)}
                                        sx={{
                                            flexShrink: 0,
                                            color: "text.disabled",
                                            "&:hover": { color: "error.main" },
                                            p: { xs: 1, sm: 0.75 },
                                            alignSelf: { xs: "flex-start", sm: "flex-start" },
                                        }}
                                    >
                                        <DeleteRoundedIcon sx={{ fontSize: { xs: 18, sm: 16 } }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))}
                </Paper>
            )}

            {/* ── Paginación ─────────────────────────────── */}
            {totalPages > 1 && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        mt: 1,
                        px: { xs: 0.5, sm: 0 },
                        maxWidth: "100%",
                        overflow: "hidden",
                    }}
                >
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, v) => setPage(v)}
                        color="primary"
                        shape="rounded"
                        size={isNarrow ? "small" : "medium"}
                        siblingCount={isNarrow ? 0 : 1}
                        boundaryCount={1}
                        sx={{
                            "& .MuiPagination-ul": {
                                flexWrap: "wrap",
                                justifyContent: "center",
                                rowGap: 0.5,
                            },
                        }}
                    />
                </Box>
            )}

            {!loading && totalElements > 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
                    {totalElements} notificaci{totalElements === 1 ? "ón" : "ones"} en total
                </Typography>
            )}
        </Box>
    );
}
