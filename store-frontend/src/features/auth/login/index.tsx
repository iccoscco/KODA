'use client';

import { Box, useTheme } from "@mui/material";
import ThemeToggle from "@/shared/components/themeToggle";
import AuthPublicEntryCleanup from "@/features/auth/components/AuthPublicEntryCleanup";
import LoginForm from "@/features/auth/login/components/loginForm";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import { toMediaUrl } from "@/shared/utils/mediaUrl";

export default function Login() {
    const theme   = useTheme();
    const logoUrl = useStoreConfigStore((s) => s.logoUrl);
    const isDark  = theme.palette.mode === "dark";
    const src     = logoUrl ? toMediaUrl(logoUrl) : null;

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                bgcolor: "background.default",
            }}
        >
            <AuthPublicEntryCleanup />
            <ThemeToggle floating />

            <Box
                sx={{
                    width: { xs: "90%", sm: "420px" },
                    bgcolor: "background.card",
                    backdropFilter: "blur(12px)",
                    borderRadius: 3,
                    p: { xs: 3, sm: 5 },
                    boxShadow: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0,
                }}
            >
                {src && (
                    <Box
                        sx={{
                            mb: 1,
                            mt: -1,
                            // En modo oscuro, un círculo blanco enmarca el logo
                            // para que el fondo blanco del PNG no se vea como caja flotante
                            ...(isDark ? {
                                bgcolor: "white",
                                borderRadius: "50%",
                                p: "6px",
                                boxShadow: "0 2px 16px rgba(0,0,0,0.35)",
                            } : {
                                // En modo claro: multiply hace el fondo blanco invisible
                                mixBlendMode: "multiply",
                            }),
                        }}
                    >
                        <Box
                            component="img"
                            src={src}
                            alt="Logo"
                            sx={{
                                width: 110,
                                height: 110,
                                objectFit: "contain",
                                display: "block",
                                borderRadius: isDark ? "50%" : 0,
                            }}
                        />
                    </Box>
                )}

                <LoginForm />
            </Box>
        </Box>
    );
}
