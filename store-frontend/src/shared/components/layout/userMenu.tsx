'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Avatar,
    Box,
    CircularProgress,
    Divider,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { AuthService } from "@/shared/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { toMediaUrl } from "@/shared/utils/mediaUrl";

function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}

export default function UserMenu() {
    const router = useRouter();
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const [loading, setLoading] = useState(false);
    const user = useAuthStore((s) => s.user);
    const initials = user ? getInitials(user.name) : null;
    const avatarSrc = toMediaUrl(user?.avatarUrl) || undefined;

    const handleLogout = async () => {
        setLoading(true);
        setAnchor(null);
        try {
            await AuthService.logout();
            if (typeof window !== "undefined") {
                window.location.assign("/login");
            } else {
                router.replace("/login");
            }
        } catch {
            setLoading(false);
        }
    };

    return (
        <>
            <Tooltip title="Mi cuenta">
                <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
                    <Avatar
                        src={avatarSrc}
                        sx={{
                            width: 34,
                            height: 34,
                            bgcolor: avatarSrc ? "transparent" : "primary.main",
                            color: "primary.contrastText",
                            fontSize: 13,
                            fontWeight: 700,
                            transform: "translateZ(0)",
                        }}
                    >
                        {initials ?? <PersonRoundedIcon fontSize="small" />}
                    </Avatar>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{
                    paper: {
                        elevation: 3,
                        sx: { mt: 1, minWidth: 200, borderRadius: 2 },
                    },
                }}
            >
                {/* Info del usuario */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    {user ? (
                        <>
                            <Typography variant="body2" fontWeight={600} noWrap>
                                {user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {user.email}
                            </Typography>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Mi cuenta
                        </Typography>
                    )}
                </Box>

                <Divider />

                <MenuItem
                    onClick={handleLogout}
                    disabled={loading}
                    sx={{ color: "error.main", mt: 0.5 }}
                >
                    <ListItemIcon>
                        {loading
                            ? <CircularProgress size={16} color="error" />
                            : <LogoutRoundedIcon fontSize="small" color="error" />
                        }
                    </ListItemIcon>
                    Cerrar sesión
                </MenuItem>
            </Menu>
        </>
    );
}
