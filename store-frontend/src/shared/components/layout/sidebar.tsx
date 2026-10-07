'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Badge,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, HEADER_HEIGHT } from "@/shared/components/layout/constants";
import { navItems } from "@/shared/config/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { AuthService } from "@/shared/services/auth.service";
import { toMediaUrl } from "@/shared/utils/mediaUrl";

interface SidebarProps {
    collapsed?: boolean;
    /** Solo drawer móvil: botón cerrar + cierre al navegar. */
    onMobileClose?: () => void;
}

/** Logo en cabecera del drawer: aprovecha HEADER_HEIGHT (64px) sin desbordar. */
const LOGO_PX = { expanded: 56, collapsed: 44 } as const;

export default function Sidebar({ collapsed = false, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const width = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
    const hasPermission  = useAuthStore((s) => s.hasPermission);
    const _hasHydrated   = useAuthStore((s) => s._hasHydrated);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const storeName    = useStoreConfigStore((s) => s.storeName);
    const logoUrl      = useStoreConfigStore((s) => s.logoUrl);
    const logoSrc      = toMediaUrl(logoUrl) || null;
    const unreadCount  = useNotificationsStore((s) => s.unreadCount);

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await AuthService.logout();
            window.location.assign("/login");
        } catch {
            /* el backend puede fallar; re-habilitamos únicamente si hay error crítico */
            setLogoutLoading(false);
            setConfirmOpen(false);
        }
    };

    const visibleItems = _hasHydrated
        ? navItems.filter((item) => !item.permission || hasPermission(item.permission))
        : navItems.filter((item) => !item.permission);

    return (
        <Box
            sx={{
                width,
                display: "flex",
                flexDirection: "column",
                height: "100%",
                bgcolor: "background.paper",
                overflow: "hidden",
                transition: "width 0.2s ease",
            }}
        >
            {/* Logo — misma altura que el header; en móvil: botón cerrar menú */}
            <Box
                sx={{
                    height: HEADER_HEIGHT,
                    minHeight: HEADER_HEIGHT,
                    pl: collapsed ? 0 : 2,
                    pr: onMobileClose ? 0.5 : collapsed ? 0 : 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: onMobileClose ? "space-between" : collapsed ? "center" : "flex-start",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    overflow: "hidden",
                    gap: collapsed && !onMobileClose ? 1 : 1.75,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.75,
                        minWidth: 0,
                        flex: onMobileClose ? 1 : undefined,
                        justifyContent: collapsed && !onMobileClose ? "center" : "flex-start",
                    }}
                >
                {/* Logo image or icon */}
                {logoSrc ? (
                    <Tooltip
                        title={storeName?.trim() ? storeName : "Tienda"}
                        placement="right"
                        arrow
                    >
                        <Box
                            sx={{
                                position: "relative",
                                width: collapsed ? LOGO_PX.collapsed : LOGO_PX.expanded,
                                height: collapsed ? LOGO_PX.collapsed : LOGO_PX.expanded,
                                flexShrink: 0,
                                borderRadius: 1.5,
                                overflow: "hidden",
                                cursor: "default",
                            }}
                        >
                            <Image
                                src={logoSrc}
                                alt={storeName || "Logo"}
                                fill
                                style={{ objectFit: "contain" }}
                                unoptimized
                                priority
                            />
                        </Box>
                    </Tooltip>
                ) : (
                    <Box
                        sx={{
                            width: collapsed ? LOGO_PX.collapsed : LOGO_PX.expanded,
                            height: collapsed ? LOGO_PX.collapsed : LOGO_PX.expanded,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            bgcolor: "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "primary.contrastText",
                        }}
                    >
                        <StorefrontRoundedIcon fontSize="small" />
                    </Box>
                )}

                {!collapsed && (
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        {logoSrc ? (
                            <Tooltip
                                title={storeName?.trim() || "Mi tienda"}
                                placement="bottom-start"
                                arrow
                            >
                                <Box component="span" sx={{ display: "block", minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap>
                                        Panel de administración
                                    </Typography>
                                </Box>
                            </Tooltip>
                        ) : (
                            <>
                                <Tooltip title={storeName || "Mi Tienda"} placement="bottom-start" arrow>
                                    <Typography variant="subtitle1" fontWeight={700} letterSpacing={0.3} noWrap>
                                        {storeName || "Mi Tienda"}
                                    </Typography>
                                </Tooltip>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    Panel de administración
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
                </Box>

                {onMobileClose && (
                    <Tooltip title="Cerrar menú" placement="left" arrow>
                        <IconButton
                            onClick={onMobileClose}
                            aria-label="Cerrar menú de navegación"
                            edge="end"
                            size="small"
                            sx={{
                                color: "text.secondary",
                                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                            }}
                        >
                            <CloseRoundedIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Nav */}
            <List sx={{ flexGrow: 1, px: 1.5, pt: 2 }}>
                {visibleItems.map(({ label, href, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <ListItem key={href} disablePadding sx={{ mb: 0.5 }}>
                            <Tooltip title={collapsed ? label : ""} placement="right">
                                <ListItemButton
                                    component={Link}
                                    href={href}
                                    onClick={() => onMobileClose?.()}
                                    selected={isActive}
                                    sx={{
                                        borderRadius: 2,
                                        justifyContent: collapsed ? "center" : "flex-start",
                                        px: collapsed ? 1 : 2,
                                        minWidth: 0,
                                        "&.Mui-selected": {
                                            bgcolor: "primary.main",
                                            color: "primary.contrastText",
                                            "& .MuiListItemIcon-root": {
                                                color: "primary.contrastText",
                                            },
                                            "&:hover": { bgcolor: "primary.dark" },
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: collapsed ? 0 : 40,
                                            justifyContent: "center",
                                        }}
                                    >
                                        {href === "/notifications" && unreadCount > 0 ? (
                                            <Badge badgeContent={unreadCount > 99 ? "99+" : unreadCount} color="error" max={99}>
                                                <Icon fontSize="small" />
                                            </Badge>
                                        ) : (
                                            <Icon fontSize="small" />
                                        )}
                                    </ListItemIcon>
                                    {!collapsed && (
                                        <ListItemText
                                            primary={label}
                                            slotProps={{
                                                primary: {
                                                    fontSize: 14,
                                                    fontWeight: isActive ? 600 : 400,
                                                    noWrap: true,
                                                },
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    );
                })}
            </List>

            {/* Logout — superficie redondeada, icono tono arena, texto en mayúsculas (referencia UI) */}
            <Box sx={{ px: 1.5, pb: 2 }}>
                <Tooltip title={collapsed ? "Cerrar sesión" : ""} placement="right">
                    <ListItemButton
                        onClick={() => {
                            onMobileClose?.();
                            setConfirmOpen(true);
                        }}
                        sx={{
                            borderRadius: 2,
                            justifyContent: collapsed ? "center" : "flex-start",
                            gap: collapsed ? 0 : 1.25,
                            py: 1.35,
                            px: collapsed ? 1 : 2,
                            minWidth: 0,
                            border: "none",
                            bgcolor: (t) =>
                                t.palette.mode === "dark"
                                    ? alpha(t.palette.common.white, 0.08)
                                    : alpha(t.palette.common.black, 0.06),
                            color: (t) =>
                                t.palette.mode === "dark"
                                    ? alpha("#F5F5F4", 0.98)
                                    : t.palette.text.primary,
                            "&:hover": {
                                bgcolor: (t) =>
                                    t.palette.mode === "dark"
                                        ? alpha(t.palette.common.white, 0.12)
                                        : alpha(t.palette.common.black, 0.09),
                            },
                            "& .MuiListItemIcon-root": {
                                minWidth: collapsed ? 0 : 40,
                                justifyContent: "center",
                                color: (t) =>
                                    t.palette.mode === "dark" ? "#C9B89A" : t.palette.grey[700],
                            },
                        }}
                    >
                        <ListItemIcon>
                            <LogoutRoundedIcon sx={{ fontSize: 22 }} />
                        </ListItemIcon>
                        {!collapsed && (
                            <ListItemText
                                primary="Cerrar sesión"
                                slotProps={{
                                    primary: {
                                        noWrap: true,
                                        sx: {
                                            textTransform: "uppercase",
                                            letterSpacing: "0.12em",
                                            fontWeight: 700,
                                            fontSize: "0.7rem",
                                        },
                                    },
                                }}
                            />
                        )}
                    </ListItemButton>
                </Tooltip>
            </Box>

            {/* Confirm logout dialog — disableRestoreFocus evita foco en ListItemButton bajo drawer+aria-hidden al cerrar */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Cerrar sesión?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tu sesión será cerrada y serás redirigido al inicio de sesión.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} disabled={logoutLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => void handleLogout()}
                        disabled={logoutLoading}
                    >
                        {logoutLoading ? "Cerrando…" : "Cerrar sesión"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
