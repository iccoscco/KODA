'use client';

import { useState, useEffect, ChangeEvent } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useAuthStore } from "@/store/auth.store";
import { PERMISSIONS } from "@/shared/config/permissions";
import { SettingsService } from "../services/settings.service";
import type { StoreConfig } from "../types/settingsTypes";

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

export default function PrinterTab() {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canUpdateStore = hasPermission(PERMISSIONS.SETTINGS.UPDATE);

    const [storeFetching, setStoreFetching] = useState(true);
    const [storeOriginal, setStoreOriginal] = useState<StoreConfig | null>(null);

    const [printerForm, setPrinterForm] = useState<{
        printerName: string;
        printerIp: string;
        printerPort: number;
        printerType: string;
    }>({
        printerName: "",
        printerIp: "",
        printerPort: 9100,
        printerType: "NONE",
    });

    const [printerLoading, setPrinterLoading] = useState(false);
    const [printerSuccess, setPrinterSuccess] = useState(false);
    const [printerError, setPrinterError] = useState<string | null>(null);
    const [testLoading, setTestLoading] = useState(false);
    const [testSuccess, setTestSuccess] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);

    useEffect(() => {
        setStoreFetching(true);
        SettingsService.getStoreConfig()
            .then((cfg) => {
                setStoreOriginal(cfg);
                setPrinterForm({
                    printerName: cfg.printerName ?? "",
                    printerIp: cfg.printerIp ?? "",
                    printerPort: cfg.printerPort ?? 9100,
                    printerType: cfg.printerType ?? "NONE",
                });
            })
            .catch(() => setPrinterError("No se pudo cargar la configuración de la impresora"))
            .finally(() => setStoreFetching(false));
    }, []);

    const printerChanged =
        storeOriginal !== null && (
            printerForm.printerName.trim() !== (storeOriginal.printerName ?? "") ||
            printerForm.printerIp.trim() !== (storeOriginal.printerIp ?? "") ||
            printerForm.printerPort !== (storeOriginal.printerPort ?? 9100) ||
            printerForm.printerType !== (storeOriginal.printerType ?? "NONE")
        );

    const isDirectPrint = printerForm.printerType === "ESC_POS_TCP";

    const handlePrinterChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPrinterForm((prev) => ({
            ...prev,
            [name]: name === "printerPort" ? parseInt(value) || 0 : value,
        }));
        setPrinterSuccess(false);
        setPrinterError(null);
        setTestSuccess(false);
        setTestError(null);
    };

    const handlePrinterSubmit = async () => {
        setPrinterLoading(true);
        setPrinterError(null);
        setPrinterSuccess(false);
        try {
            // Mantiene el resto de datos de la tienda y actualiza impresora
            const config = await SettingsService.getStoreConfig();
            const updated = await SettingsService.updateStoreConfig({
                storeName: config.storeName,
                storeRuc: config.storeRuc ?? "",
                storeAddress: config.storeAddress ?? "",
                ...printerForm,
            });
            setStoreOriginal(updated);
            setPrinterSuccess(true);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Error al guardar la configuración de impresora";
            setPrinterError(msg);
        } finally {
            setPrinterLoading(false);
        }
    };

    const handlePrinterTest = async () => {
        setTestLoading(true);
        setTestError(null);
        setTestSuccess(false);
        try {
            await SettingsService.testPrinterConnection(printerForm.printerIp, printerForm.printerPort);
            setTestSuccess(true);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "No se pudo conectar con la ticketera";
            setTestError(msg);
        } finally {
            setTestLoading(false);
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
            <SectionTitle>Configuración de Impresora</SectionTitle>
            <TabPanelCard>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configura los parámetros para la impresión directa a través de sockets TCP/IP locales.
                    Si la impresión directa falla o está desactivada, el sistema usará el flujo estándar de recibo PDF.
                </Typography>
                <Stack spacing={2}>
                    <TextField
                        label="Nombre de la impresora"
                        name="printerName"
                        value={printerForm.printerName}
                        onChange={handlePrinterChange}
                        placeholder="Ej. XPrinter Caja 1"
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore || !isDirectPrint}
                    />
                    <TextField
                        label="Dirección IP de la impresora"
                        name="printerIp"
                        value={printerForm.printerIp}
                        onChange={handlePrinterChange}
                        placeholder="Ej. 192.168.100.32"
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore || !isDirectPrint}
                        helperText="La ticketera debe estar conectada a la misma red local que el servidor."
                    />
                    <TextField
                        label="Puerto de la impresora"
                        name="printerPort"
                        type="number"
                        value={printerForm.printerPort}
                        onChange={handlePrinterChange}
                        placeholder="Por defecto 9100"
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore || !isDirectPrint}
                    />
                    <TextField
                        label="Tipo de Conexión / Flujo"
                        name="printerType"
                        value={printerForm.printerType}
                        onChange={handlePrinterChange}
                        select
                        fullWidth
                        size="small"
                        disabled={!canUpdateStore}
                    >
                        <MenuItem value="NONE">Impresión estándar (Generar PDF / Conexión USB)</MenuItem>
                        <MenuItem value="ESC_POS_TCP">Impresión directa rápida (Red local TCP/IP)</MenuItem>
                    </TextField>

                    {testError && <Alert severity="error">{testError}</Alert>}
                    {testSuccess && <Alert severity="success">¡Conexión de prueba con la ticketera exitosa!</Alert>}
                    {printerError && <Alert severity="error">{printerError}</Alert>}
                    {printerSuccess && <Alert severity="success">Configuración de impresora guardada con éxito.</Alert>}

                    <Box sx={{ display: "flex", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
                        {isDirectPrint && printerForm.printerIp.trim() && printerForm.printerPort > 0 && (
                            <Button
                                variant="outlined"
                                color="info"
                                onClick={handlePrinterTest}
                                disabled={testLoading || printerLoading}
                                startIcon={
                                    testLoading ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <PrintRoundedIcon />
                                    )
                                }
                                sx={{ fontWeight: 700 }}
                            >
                                {testLoading ? "Probando..." : "Probar conexión"}
                            </Button>
                        )}
                        {canUpdateStore && (
                            <Button
                                variant="contained"
                                onClick={handlePrinterSubmit}
                                disabled={printerLoading || testLoading || !printerChanged}
                                startIcon={
                                    printerLoading ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <SaveRoundedIcon />
                                    )
                                }
                                sx={{ fontWeight: 700 }}
                            >
                                {printerLoading ? "Guardando..." : "Guardar configuración"}
                            </Button>
                        )}
                    </Box>
                </Stack>
            </TabPanelCard>
        </Stack>
    );
}
