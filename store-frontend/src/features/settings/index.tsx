'use client';

import { useState } from "react";
import {
    Box,
    CircularProgress,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";

import { useAuthStore } from "@/store/auth.store";
import { PERMISSIONS } from "@/shared/config/permissions";

// Standalone Tab Components
import ProfileTab from "./components/ProfileTab";
import SecurityTab from "./components/SecurityTab";
import StoreTab from "./components/StoreTab";
import PrinterTab from "./components/PrinterTab";

export default function Settings() {
    const hasPermission  = useAuthStore((s) => s.hasPermission);
    const _hasHydrated   = useAuthStore((s) => s._hasHydrated);

    const [tab, setTab] = useState(0);

    if (!_hasHydrated) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    const canReadStore = hasPermission(PERMISSIONS.SETTINGS.READ);

    return (
        <Box
            sx={{
                maxWidth: 720,
                width: "100%",
                minWidth: 0,
                mx: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 2,
            }}
        >
            <Box>
                <Typography
                    component="h1"
                    variant="h5"
                    fontWeight={800}
                    letterSpacing="0.06em"
                    sx={{ color: "primary.main", mb: 0.5 }}
                >
                    Configuración
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Perfil, contraseña y datos de la tienda en un solo lugar.
                </Typography>
            </Box>

            <Box
                sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    mx: { xs: -0.5, sm: 0 },
                    "& .MuiTab-root": { minHeight: 48, textTransform: "none", fontWeight: 600 },
                }}
            >
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ px: { xs: 0.5, sm: 0 } }}
                >
                    <Tab icon={<PersonRoundedIcon />} iconPosition="start" label="Perfil" />
                    <Tab icon={<LockRoundedIcon />} iconPosition="start" label="Seguridad" />
                    {canReadStore && (
                        <Tab icon={<StorefrontRoundedIcon />} iconPosition="start" label="Tienda" />
                    )}
                    {canReadStore && (
                        <Tab icon={<PrintRoundedIcon />} iconPosition="start" label="Impresora" />
                    )}
                </Tabs>
            </Box>

            {/* Render selected tab panel */}
            {tab === 0 && <ProfileTab />}
            {tab === 1 && <SecurityTab />}
            {tab === 2 && canReadStore && <StoreTab />}
            {tab === 3 && canReadStore && <PrinterTab />}
        </Box>
    );
}
