'use client';

import { useState, useEffect, useRef, ChangeEvent } from "react";
import {
    Alert,
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
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useAuthStore } from "@/store/auth.store";
import { PERMISSIONS } from "@/shared/config/permissions";
import { SettingsService } from "../services/settings.service";
import type { StoreConfig, StoreConfigUpdate } from "../types/settingsTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import AvatarPreviewDialog from "@/shared/components/AvatarPreviewDialog";
import { useStoreConfigStore } from "@/store/storeConfig.store";
import Image from "next/image";

const STORE_LOGO_PREVIEW_PX = 160;

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

export default function StoreTab() {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canUpdateStore = hasPermission(PERMISSIONS.SETTINGS.UPDATE);

    const [storeForm, setStoreForm] = useState<StoreConfigUpdate>({ storeName: "", storeRuc: "", storeAddress: "" });
    const [storeLoading, setStoreLoading]   = useState(false);
    const [storeFetching, setStoreFetching] = useState(true);
    const [storeSuccess, setStoreSuccess]   = useState(false);
    const [storeError, setStoreError]       = useState<string | null>(null);
    const [storeOriginal, setStoreOriginal] = useState<StoreConfig | null>(null);

    /* ── Logo tienda ─────────────────────────────────── */
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const [logoLoading, setLogoLoading]   = useState(false);
    const [logoError, setLogoError]       = useState<string | null>(null);
    const [logoDeleteConfirm, setLogoDeleteConfirm] = useState(false);
    const [logoPreviewOpen, setLogoPreviewOpen]     = useState(false);
    const setGlobalLogo = useStoreConfigStore((s) => s.setLogoUrl);
    const setGlobalStoreConfig = useStoreConfigStore((s) => s.setStoreConfig);

    useEffect(() => {
        setStoreFetching(true);
        SettingsService.getStoreConfig()
            .then((cfg) => {
                setStoreOriginal(cfg);
                setStoreForm({ storeName: cfg.storeName, storeRuc: cfg.storeRuc ?? "", storeAddress: cfg.storeAddress ?? "" });
                setGlobalStoreConfig({ storeName: cfg.storeName, logoUrl: cfg.logoUrl ?? null });
            })
            .catch(() => setStoreError("No se pudo cargar la configuración de la tienda"))
            .finally(() => setStoreFetching(false));
    }, [setGlobalStoreConfig]);

    const storeChanged =
        storeOriginal !== null && (
            storeForm.storeName.trim() !== storeOriginal.storeName ||
            (storeForm.storeRuc ?? "") !== (storeOriginal.storeRuc ?? "") ||
            (storeForm.storeAddress ?? "") !== (storeOriginal.storeAddress ?? "")
        );

    const handleStoreChange = (e: ChangeEvent<HTMLInputElement>) => {
        setStoreForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setStoreSuccess(false);
        setStoreError(null);
    };

    const handleStoreSubmit = async () => {
        setStoreLoading(true);
        setStoreError(null);
        setStoreSuccess(false);
        try {
            const updated = await SettingsService.updateStoreConfig(storeForm);
            setStoreOriginal(updated);
            setStoreForm({ storeName: updated.storeName, storeRuc: updated.storeRuc ?? "", storeAddress: updated.storeAddress ?? "" });
            setGlobalStoreConfig({ storeName: updated.storeName, logoUrl: updated.logoUrl ?? null });
            setStoreSuccess(true);
        } catch (err: unknown) {
            setStoreError(err instanceof Error ? err.message : "Error al guardar la configuración");
        } finally {
            setStoreLoading(false);
        }
    };

    /* ── Logo Handlers ─────────────────────────────── */
    const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoLoading(true);
        setLogoError(null);
        try {
            const updated = await SettingsService.uploadLogo(file);
            setStoreOriginal(updated);
            setGlobalLogo(updated.logoUrl ?? null);
        } catch (err: unknown) {
            setLogoError(err instanceof Error ? err.message : "Error al subir el logo");
        } finally {
            setLogoLoading(false);
            if (logoFileInputRef.current) logoFileInputRef.current.value = "";
        }
    };

    const handleLogoDelete = async () => {
        setLogoDeleteConfirm(false);
        setLogoLoading(true);
        setLogoError(null);
        try {
            const updated = await SettingsService.deleteLogo();
            setStoreOriginal(updated);
            setGlobalLogo(null);
        } catch (err: unknown) {
            setLogoError(err instanceof Error ? err.message : "Error al eliminar el logo");
        } finally {
            setLogoLoading(false);
        }
    };

    if (storeFetching) {
        return (
            <TabPanelCard>
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={32} />
                </Box>
            </TabPanelCard>
        );
    }

    return (
        <Stack spacing={3}>
            <SectionTitle>Logo de la tienda</SectionTitle>
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
                        <Box
                            onClick={
                                storeOriginal?.logoUrl && !logoLoading
                                    ? () => setLogoPreviewOpen(true)
                                    : undefined
                            }
                            sx={{
                                width: STORE_LOGO_PREVIEW_PX,
                                height: STORE_LOGO_PREVIEW_PX,
                                borderRadius: 2,
                                border: "2px solid",
                                borderColor: storeOriginal?.logoUrl ? "primary.main" : "divider",
                                bgcolor: "action.hover",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                position: "relative",
                                cursor: storeOriginal?.logoUrl && !logoLoading ? "pointer" : "default",
                                boxShadow: storeOriginal?.logoUrl ? 2 : 0,
                                transition: "opacity 0.15s, border-color 0.15s",
                                "&:hover":
                                    storeOriginal?.logoUrl && !logoLoading
                                        ? { opacity: 0.92 }
                                        : {},
                            }}
                        >
                            {logoLoading ? (
                                <CircularProgress size={36} />
                            ) : storeOriginal?.logoUrl ? (
                                <Image
                                    src={toMediaUrl(storeOriginal.logoUrl) || ""}
                                    alt="Logo"
                                    fill
                                    style={{ objectFit: "contain", padding: "10px" }}
                                    unoptimized
                                />
                            ) : (
                                <StorefrontRoundedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
                            )}
                        </Box>
                        {canUpdateStore && (
                            <>
                                <Tooltip title="Elegir imagen">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            logoFileInputRef.current?.click();
                                        }}
                                        disabled={logoLoading}
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
                                {storeOriginal?.logoUrl && (
                                    <Tooltip title="Eliminar imagen">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLogoDeleteConfirm(true);
                                            }}
                                            disabled={logoLoading}
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
                                    ref={logoFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={handleLogoUpload}
                                />
                            </>
                        )}
                    </Box>

                    <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Imagen del comercio
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", maxWidth: { xs: "100%", sm: 420 }, mx: { xs: "auto", sm: 0 } }}
                        >
                            Toca la imagen para verla en grande. Se usa en el panel y en recibos; PNG, JPG o SVG, idealmente cuadrada.
                        </Typography>
                        {canUpdateStore && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddPhotoAlternateRoundedIcon />}
                                onClick={() => logoFileInputRef.current?.click()}
                                disabled={logoLoading}
                                sx={{ alignSelf: { xs: "center", sm: "flex-start" }, mt: 0.5, fontWeight: 700 }}
                            >
                                {storeOriginal?.logoUrl ? "Elegir otra imagen" : "Elegir imagen"}
                            </Button>
                        )}
                    </Stack>
                </Box>
                {logoError && <Alert severity="error" sx={{ mt: 2 }}>{logoError}</Alert>}

                {storeOriginal?.logoUrl && (
                    <AvatarPreviewDialog
                        open={logoPreviewOpen}
                        src={toMediaUrl(storeOriginal.logoUrl) || ""}
                        alt="Logo de la tienda"
                        onClose={() => setLogoPreviewOpen(false)}
                    />
                )}
            </TabPanelCard>

            <SectionTitle>Datos de la tienda</SectionTitle>
            <TabPanelCard>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Esta información aparece en el encabezado de las notas de venta (recibos PDF).
                </Typography>
                <Stack spacing={2}>
                    <TextField
                        label="Nombre de la tienda"
                        name="storeName"
                        value={storeForm.storeName}
                        onChange={handleStoreChange}
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore}
                        required
                    />
                    <TextField
                        label="RUC"
                        name="storeRuc"
                        value={storeForm.storeRuc ?? ""}
                        onChange={handleStoreChange}
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore}
                        inputProps={{ maxLength: 20 }}
                    />
                    <TextField
                        label="Dirección"
                        name="storeAddress"
                        value={storeForm.storeAddress ?? ""}
                        onChange={handleStoreChange}
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore}
                        multiline
                        rows={2}
                    />

                    {storeError && <Alert severity="error">{storeError}</Alert>}
                    {storeSuccess && <Alert severity="success">Configuración guardada correctamente</Alert>}

                    {canUpdateStore && (
                        <Button
                            variant="contained"
                            onClick={handleStoreSubmit}
                            disabled={storeLoading || !storeChanged || !storeForm.storeName.trim()}
                            startIcon={
                                storeLoading
                                    ? <CircularProgress size={16} color="inherit" />
                                    : <SaveRoundedIcon />
                            }
                            sx={{
                                alignSelf: { xs: "stretch", sm: "flex-start" },
                                width: { xs: "100%", sm: "auto" },
                                fontWeight: 700,
                            }}
                        >
                            {storeLoading ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    )}
                </Stack>
            </TabPanelCard>

            {/* ── Confirmación eliminar logo ── */}
            <Dialog
                open={logoDeleteConfirm}
                onClose={() => setLogoDeleteConfirm(false)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle>¿Eliminar logo de la tienda?</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                            El logo será eliminado y se mostrará un ícono predeterminado en el panel.
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
                            <Button variant="outlined" color="inherit" onClick={() => setLogoDeleteConfirm(false)}>
                                Cancelar
                            </Button>
                            <Button variant="contained" color="error" onClick={handleLogoDelete}>
                                Eliminar
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
