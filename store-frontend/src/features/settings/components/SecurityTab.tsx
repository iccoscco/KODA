'use client';

import { useState, ChangeEvent } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { SettingsService } from "../services/settings.service";
import type { ChangePasswordForm } from "../types/settingsTypes";

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant="overline"
            sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: "0.14em",
                display: "block",
                mb: 1.25,
                lineHeight: 1.4,
            }}
        >
            {children}
        </Typography>
    );
}

function TabPanelCard({ children, sx }: { children: React.ReactNode; sx?: object }) {
    const theme = useTheme();
    const bg =
        theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03);
    return (
        <Box
            sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: bg,
                ...sx,
            }}
        >
            {children}
        </Box>
    );
}

export default function SecurityTab() {
    /* ── Contraseña ─────────────────────────────────── */
    const [passwords, setPasswords] = useState<ChangePasswordForm>({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passSuccess, setPassSuccess] = useState(false);
    const [passError, setPassError] = useState<string | null>(null);

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setPassSuccess(false);
        setPassError(null);
    };

    const handlePasswordSubmit = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) {
            setPassError("La nueva contraseña y la confirmación no coinciden");
            return;
        }
        setPassLoading(true);
        setPassError(null);
        setPassSuccess(false);
        try {
            await SettingsService.changePassword(passwords);
            setPassSuccess(true);
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al cambiar la contraseña";
            setPassError(msg);
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <Stack spacing={3}>
            <SectionTitle>Contraseña</SectionTitle>
            <TabPanelCard>
                <Stack spacing={0.75} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Cambiar contraseña
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Escribe tu contraseña actual y la nueva dos veces para confirmar.
                    </Typography>
                </Stack>

                <Stack spacing={2}>
                    <TextField
                        label="Contraseña actual"
                        name="currentPassword"
                        type={showCurrent ? "text" : "password"}
                        value={passwords.currentPassword}
                        onChange={handlePasswordChange}
                        fullWidth
                        size="small"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end" aria-label="Mostrar contraseña">
                                        {showCurrent ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        label="Nueva contraseña"
                        name="newPassword"
                        type={showNew ? "text" : "password"}
                        value={passwords.newPassword}
                        onChange={handlePasswordChange}
                        fullWidth
                        size="small"
                        helperText="Mínimo 6 caracteres"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowNew((v) => !v)} edge="end" aria-label="Mostrar contraseña">
                                        {showNew ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        label="Confirmar nueva contraseña"
                        name="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        value={passwords.confirmPassword}
                        onChange={handlePasswordChange}
                        fullWidth
                        size="small"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" aria-label="Mostrar contraseña">
                                        {showConfirm ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {passError && <Alert severity="error">{passError}</Alert>}
                    {passSuccess && <Alert severity="success">Contraseña cambiada correctamente</Alert>}

                    <Button
                        variant="contained"
                        onClick={handlePasswordSubmit}
                        disabled={passLoading || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
                        startIcon={
                            passLoading
                                ? <CircularProgress size={16} color="inherit" />
                                : <SaveRoundedIcon />
                        }
                        sx={{
                            alignSelf: { xs: "stretch", sm: "flex-start" },
                            width: { xs: "100%", sm: "auto" },
                            fontWeight: 700,
                        }}
                    >
                        Cambiar contraseña
                    </Button>
                </Stack>
            </TabPanelCard>
        </Stack>
    );
}
