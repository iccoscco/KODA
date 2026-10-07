'use client';

import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useAuthStore } from "@/store/auth.store";
import { SettingsService } from "../services/settings.service";
import type { UpdateProfileForm } from "../types/settingsTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import AvatarPreviewDialog from "@/shared/components/AvatarPreviewDialog";

const PROFILE_AVATAR_PX = 128;

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

export default function ProfileTab() {
    const user         = useAuthStore((s) => s.user);
    const setSession   = useAuthStore((s) => s.setSession);
    const clearSession = useAuthStore((s) => s.clearSession);

    /* ── Perfil ─────────────────────────────────────── */
    const [profile, setProfile] = useState<UpdateProfileForm>({
        name: user?.name ?? "",
        email: user?.email ?? "",
    });

    // Sincroniza los campos cuando el usuario cambia
    useEffect(() => {
        if (user) {
            setProfile({ name: user.name, email: user.email });
        }
    }, [user?.name, user?.email]);

    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
    const [emailRedirectCountdown, setEmailRedirectCountdown] = useState<number | null>(null);

    const profileChanged =
        profile.name.trim() !== (user?.name ?? "") ||
        profile.email.trim() !== (user?.email ?? "");

    const emailChanged = profile.email.trim() !== (user?.email ?? "");

    // Countdown después de confirmar el cambio de email
    useEffect(() => {
        if (emailRedirectCountdown === null) return;
        if (emailRedirectCountdown === 0) {
            clearSession();
            window.location.href = "/login";
            return;
        }
        const timer = setTimeout(() => setEmailRedirectCountdown((c) => (c ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [emailRedirectCountdown, clearSession]);

    /* ── Avatar ─────────────────────────────────────── */
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
    const [avatarDeleteConfirmOpen, setAvatarDeleteConfirmOpen] = useState(false);

    /* ── Helpers ────────────────────────────────────── */
    const avatarSrc = toMediaUrl(user?.avatarUrl) || undefined;

    const initials = user?.name
        ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
        : "?";

    /* ── Handlers ───────────────────────────────────── */
    const handleProfileChange = (e: ChangeEvent<HTMLInputElement>) => {
        setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setProfileSuccess(false);
        setProfileError(null);
    };

    const handleProfileSubmit = async () => {
        setEmailConfirmOpen(false);
        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(false);
        try {
            const updated = await SettingsService.updateProfile(profile);
            if (user) {
                setSession(updated);
            }
            if (emailChanged) {
                setEmailRedirectCountdown(5);
            } else {
                setProfileSuccess(true);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al actualizar el perfil";
            setProfileError(msg);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleProfileSaveClick = () => {
        if (emailChanged) {
            setEmailConfirmOpen(true);
        } else {
            handleProfileSubmit();
        }
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarDelete = async () => {
        setAvatarDeleteConfirmOpen(false);
        setAvatarLoading(true);
        setAvatarError(null);
        try {
            const updated = await SettingsService.deleteAvatar();
            if (user) {
                setSession(updated);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al eliminar la imagen";
            setAvatarError(msg);
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarLoading(true);
        setAvatarError(null);
        try {
            const updated = await SettingsService.uploadAvatar(file);
            if (user) {
                setSession(updated);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al subir la imagen";
            setAvatarError(msg);
        } finally {
            setAvatarLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Stack spacing={3}>
            <SectionTitle>Foto de perfil</SectionTitle>
            <TabPanelCard>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "center", sm: "flex-start" },
                        gap: 2.5,
                    }}
                >
                    <Box sx={{ position: "relative", flexShrink: 0 }}>
                        <Avatar
                            src={avatarSrc}
                            onClick={avatarSrc ? () => setAvatarPreviewOpen(true) : undefined}
                            sx={{
                                width: PROFILE_AVATAR_PX,
                                height: PROFILE_AVATAR_PX,
                                fontSize: 40,
                                bgcolor: avatarSrc ? "transparent" : "primary.main",
                                transform: "translateZ(0)",
                                cursor: avatarSrc ? "pointer" : "default",
                                border: avatarSrc ? "2px solid" : "none",
                                borderColor: "primary.main",
                                boxShadow: avatarSrc ? 2 : 0,
                            }}
                        >
                            {!avatarSrc && initials}
                        </Avatar>
                        {avatarLoading && (
                            <CircularProgress
                                size={PROFILE_AVATAR_PX}
                                thickness={2.5}
                                sx={{ position: "absolute", top: 0, left: 0, color: "primary.main" }}
                            />
                        )}
                        <Tooltip title="Elegir imagen">
                            <IconButton
                                size="small"
                                onClick={handleAvatarClick}
                                disabled={avatarLoading}
                                sx={{
                                    position: "absolute",
                                    bottom: 4,
                                    right: 4,
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    boxShadow: 1,
                                    "&:hover": { bgcolor: "action.hover" },
                                }}
                            >
                                <EditRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        {avatarSrc && (
                            <Tooltip title="Eliminar imagen">
                                <IconButton
                                    size="small"
                                    onClick={() => setAvatarDeleteConfirmOpen(true)}
                                    disabled={avatarLoading}
                                    sx={{
                                        position: "absolute",
                                        top: 4,
                                        right: 4,
                                        bgcolor: "background.paper",
                                        border: "1px solid",
                                        borderColor: "error.main",
                                        color: "error.main",
                                        boxShadow: 1,
                                        "&:hover": { bgcolor: "error.main", color: "error.contrastText" },
                                    }}
                                >
                                    <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleAvatarChange}
                        />
                    </Box>
                    <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {user?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {user?.role}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", maxWidth: { xs: "100%", sm: 400 }, mx: { xs: "auto", sm: 0 } }}
                        >
                            Toca la imagen para verla en grande. Formatos habituales (JPG, PNG, etc.).
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddPhotoAlternateRoundedIcon />}
                            onClick={handleAvatarClick}
                            disabled={avatarLoading}
                            sx={{ alignSelf: { xs: "center", sm: "flex-start" }, mt: 0.5, fontWeight: 700 }}
                        >
                            {avatarSrc ? "Elegir otra imagen" : "Elegir imagen"}
                        </Button>
                    </Stack>
                </Box>
            </TabPanelCard>

            {avatarError && <Alert severity="error">{avatarError}</Alert>}

            {avatarSrc && (
                <AvatarPreviewDialog
                    open={avatarPreviewOpen}
                    src={avatarSrc}
                    alt={user?.name}
                    onClose={() => setAvatarPreviewOpen(false)}
                />
            )}

            <SectionTitle>Datos de la cuenta</SectionTitle>
            <TabPanelCard>
                <Stack spacing={2}>
                    <TextField
                        label="Nombre"
                        name="name"
                        value={profile.name}
                        onChange={handleProfileChange}
                        fullWidth
                        size="small"
                    />
                    <TextField
                        label="Correo electrónico"
                        name="email"
                        type="email"
                        value={profile.email}
                        onChange={handleProfileChange}
                        fullWidth
                        size="small"
                    />

                    {profileError && <Alert severity="error">{profileError}</Alert>}
                    {profileSuccess && (
                        <Alert severity="success" sx={{ "& .MuiAlert-message": { overflowWrap: "anywhere" } }}>
                            {profile.email.trim() !== user?.email
                                ? "Perfil actualizado. El correo cambió — serás redirigido al login en unos segundos."
                                : "Perfil actualizado correctamente"}
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        onClick={handleProfileSaveClick}
                        disabled={profileLoading || !profileChanged}
                        startIcon={
                            profileLoading
                                ? <CircularProgress size={16} color="inherit" />
                                : <SaveRoundedIcon />
                        }
                        sx={{
                            alignSelf: { xs: "stretch", sm: "flex-start" },
                            width: { xs: "100%", sm: "auto" },
                            fontWeight: 700,
                        }}
                    >
                        {profileLoading ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </Stack>
            </TabPanelCard>

            {/* ── Confirmación eliminar avatar ── */}
            <Dialog
                open={avatarDeleteConfirmOpen}
                onClose={() => setAvatarDeleteConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Eliminar foto de perfil?</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            Tu foto de perfil será eliminada y se mostrará tus iniciales en su lugar.
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                                flexDirection: { xs: "column-reverse", sm: "row" },
                                mt: 1,
                                "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                            }}
                        >
                            <Button variant="outlined" color="inherit" onClick={() => setAvatarDeleteConfirmOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="contained" color="error" onClick={handleAvatarDelete}>
                                Eliminar
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* ── Confirmación antes de cambiar email ── */}
            <Dialog
                open={emailConfirmOpen}
                onClose={() => { setEmailConfirmOpen(false); setProfile((p) => ({ ...p, email: user?.email ?? "" })); }}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Cambiar correo electrónico?</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                            Tu correo será cambiado de <strong>{user?.email}</strong> a <strong>{profile.email}</strong>.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Al confirmar, tu sesión actual se cerrará y deberás iniciar sesión con el nuevo correo.
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                                flexDirection: { xs: "column-reverse", sm: "row" },
                                mt: 1,
                                "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                            }}
                        >
                            <Button variant="outlined" color="inherit" onClick={() => { setEmailConfirmOpen(false); setProfile((p) => ({ ...p, email: user?.email ?? "" })); }}>
                                Cancelar
                            </Button>
                            <Button variant="contained" onClick={handleProfileSubmit} startIcon={<SaveRoundedIcon />}>
                                Confirmar cambio
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* ── Countdown tras actualizar email ── */}
            <Dialog open={emailRedirectCountdown !== null} maxWidth="xs" fullWidth disableRestoreFocus>
                <DialogTitle sx={{ textAlign: "center", pt: 3 }}>Correo actualizado</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pb: 2 }}>
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: "50%",
                                border: "4px solid",
                                borderColor: "primary.main",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Typography variant="h4" fontWeight={700} color="primary">
                                {emailRedirectCountdown}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            Redirigiendo al inicio de sesión para que ingreses con tu nuevo correo...
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
