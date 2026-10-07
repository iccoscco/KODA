'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    InputAdornment,
    IconButton,
    MenuItem,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TableContainer,
    TablePagination,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import PointOfSaleRoundedIcon       from "@mui/icons-material/PointOfSaleRounded";
import LockOpenRoundedIcon           from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon               from "@mui/icons-material/LockRounded";
import TrendingUpRoundedIcon         from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon       from "@mui/icons-material/TrendingDownRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import HistoryRoundedIcon            from "@mui/icons-material/HistoryRounded";
import AddRoundedIcon                from "@mui/icons-material/AddRounded";
import FilterAltOffRoundedIcon       from "@mui/icons-material/FilterAltOffRounded";
import TuneRoundedIcon               from "@mui/icons-material/TuneRounded";
import CloseRoundedIcon              from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon         from "@mui/icons-material/ExpandMoreRounded";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { CashService }                from "./services/cash.service";
import {
    CashCloseResult,
    CashRegisterRow,
    CashSessionHistory,
    CashStatus,
    OutflowReason,
} from "./types/cashTypes";
import { getStoredCashRegisterId, setStoredCashRegisterId } from "@/shared/config/posCashRegister";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";
import CollapsibleTable, { CollapsibleColumn } from "@/shared/components/CollapsibleTable";
import { useAuthStore, type AuthState } from "@/store/auth.store";
import { useShallow } from "zustand/react/shallow";
import type { Sale } from "./types/salesTypes";
import { useCancelSale } from "./hooks/saleHooks";
import CreateSale from "./components/sales/CreateSale";
import SaleDetailDialog from "./components/sales/SaleDetailDialog";
import SessionSalesPanel from "./components/SessionSalesPanel";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";
import { formatDateTime as fmtDate } from "@/shared/utils/dateFormat";
import { NumericField } from "@/shared/components/NumericField";

const currency = (v: number | null | undefined) =>
    v == null
        ? "—"
        : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

/** Ancho del panel lateral de filtros (historial de caja). */
const HISTORY_FILTERS_PANEL_PX = 320;

/** «Crear venta» y «Filtros» en la barra del historial: altura y aire lateral cómodos en sm+. */
const HISTORY_TOOLBAR_ACTION_SX = {
    width: { xs: "100%", sm: "auto" },
    minHeight: { sm: 40 },
    px: { xs: 2.5, sm: 4 },
    py: { xs: 1, sm: 1.125 },
    boxSizing: "border-box" as const,
};

interface SnackState { open: boolean; message: string; severity: "success" | "error" | "info" }

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
    label, value, icon, color,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: "primary" | "success" | "error" | "info";
}) {
    return (
        <Card variant="outlined" sx={{ flex: 1, minWidth: { xs: "100%", sm: 180 } }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, pb: "16px !important" }}>
                <Box
                    sx={{
                        width: 44, height: 44, borderRadius: 2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        bgcolor: `${color}.main`, color: `${color}.contrastText`,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="h6" fontWeight={700}>{currency(value)}</Typography>
                </Box>
            </CardContent>
        </Card>
    );
}

// ─── Row helper ───────────────────────────────────────────────────────────────
function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={bold ? 700 : 400}>{value}</Typography>
        </Box>
    );
}

/**
 * Etiqueta | importe en una sola fila. Grid 1fr + auto evita que el monto se comprima a cero
 * (antes el flex partía S/ 916.60 carácter a carácter).
 */
function CashDetailRow({ label, value }: { label: string; value: string }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                columnGap: 2,
                alignItems: "start",
                py: 0.5,
            }}
        >
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, lineHeight: 1.4, pr: 0.5 }}>
                {label}
            </Typography>
            <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    justifySelf: "end",
                }}
            >
                {value}
            </Typography>
        </Box>
    );
}

const selectOrderCreate = (s: AuthState) => s.hasPermission(PERMISSIONS.ORDERS.CREATE);

function CashHistoryFiltersFields({
    historyCustomerInput,
    setHistoryCustomerInput,
    historySellerInput,
    setHistorySellerInput,
    historyFromDate,
    setHistoryFromDate,
    historyToDate,
    setHistoryToDate,
}: {
    historyCustomerInput: string;
    setHistoryCustomerInput: (v: string) => void;
    historySellerInput: string;
    setHistorySellerInput: (v: string) => void;
    historyFromDate: Dayjs | null;
    setHistoryFromDate: (v: Dayjs | null) => void;
    historyToDate: Dayjs | null;
    setHistoryToDate: (v: Dayjs | null) => void;
}) {
    return (
        <>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Cliente y vendedor según texto en las ventas. Fechas por apertura de sesión.
            </Typography>
            <Stack spacing={2}>
                <TextField
                    label="Cliente (venta)"
                    placeholder="Nombre en el comprobante"
                    value={historyCustomerInput}
                    onChange={(e) => setHistoryCustomerInput(e.target.value)}
                    size="small"
                    fullWidth
                />
                <TextField
                    label="Vendedor"
                    placeholder="Quien registró la venta"
                    value={historySellerInput}
                    onChange={(e) => setHistorySellerInput(e.target.value)}
                    size="small"
                    fullWidth
                />
                <DatePicker
                    label="Apertura desde"
                    value={historyFromDate}
                    onChange={(v) => setHistoryFromDate(v)}
                    maxDate={historyToDate ?? undefined}
                    slotProps={{
                        textField: { size: "small", fullWidth: true },
                        field: { clearable: true },
                        dialog: { disableRestoreFocus: true },
                        desktopTrapFocus: { disableRestoreFocus: true },
                    }}
                />
                <DatePicker
                    label="Apertura hasta"
                    value={historyToDate}
                    onChange={(v) => setHistoryToDate(v)}
                    minDate={historyFromDate ?? undefined}
                    slotProps={{
                        textField: { size: "small", fullWidth: true },
                        field: { clearable: true },
                        dialog: { disableRestoreFocus: true },
                        desktopTrapFocus: { disableRestoreFocus: true },
                    }}
                />
            </Stack>
        </>
    );
}

// ─── Columns for the session history CollapsibleTable ─────────────────────────
const SESSION_COLUMNS: CollapsibleColumn<CashSessionHistory>[] = [
    {
        key: "cashRegisterName",
        label: "Caja",
        render: (s) => s.cashRegisterName ?? (s.cashRegisterId != null ? `#${s.cashRegisterId}` : "—"),
    },
    {
        key: "isActive",
        label: "Estado",
        render: (s) => (
            <Chip
                label={s.isActive ? "Abierta" : "Cerrada"}
                color={s.isActive ? "success" : "default"}
                size="small"
                variant="outlined"
            />
        ),
    },
    { key: "openedAt",      label: "Apertura",       render: (s) => fmtDate(s.openedAt) },
    { key: "closedAt",      label: "Cierre",         render: (s) => fmtDate(s.closedAt) },
    { key: "initialAmount", label: "Monto inicial",  align: "right", render: (s) => currency(s.initialAmount) },
    { key: "systemBalance", label: "Saldo sistema",  align: "right", render: (s) => currency(s.systemBalance) },
    { key: "closingAmount", label: "Monto contado",  align: "right", render: (s) => currency(s.closingAmount) },
    {
        key: "difference",
        label: "Diferencia",
        align: "right",
        render: (s) => {
            const diff = s.difference;
            if (diff == null) return "—";
            const color = diff === 0 ? "success.main" : diff < 0 ? "error.main" : "warning.main";
            return (
                <Typography variant="body2" fontWeight={700} color={color}>
                    {diff >= 0 ? "+" : ""}{currency(diff)}
                </Typography>
            );
        },
    },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function Cash() {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

    const canCreateRegister = useHasPermission(PERMISSIONS.CASH.CREATE_REGISTER);
    const canCreateSale     = useAuthStore(useShallow(selectOrderCreate));
    const { execute: cancelSaleExec, loading: cancellingSale } = useCancelSale();

    const [tab, setTab]               = useState(0);
    const [loading, setLoading]       = useState(true);
    const [registers, setRegisters]   = useState<CashRegisterRow[]>([]);
    const [registersLoaded, setRegistersLoaded] = useState(false);
    const [selectedRegisterId, setSelectedRegisterId] = useState<number | "">("");
    const [newRegisterName, setNewRegisterName]     = useState("");
    const [creatingRegister, setCreatingRegister]     = useState(false);
    /** Saldo acumulado de la caja seleccionada (física). */
    const [globalBalance, setGlobalBalance] = useState<number | null>(null);
    const [lifetimeSales, setLifetimeSales] = useState<number | null>(null);
    const [lifetimeNetFlow, setLifetimeNetFlow] = useState<number | null>(null);
    const [status, setStatus]         = useState<CashStatus | null>(null);
    const [reasons, setReasons]       = useState<OutflowReason[]>([]);
    const [history, setHistory]       = useState<CashSessionHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyCustomerInput, setHistoryCustomerInput] = useState("");
    const [historySellerInput, setHistorySellerInput] = useState("");
    const [historyFromDate, setHistoryFromDate] = useState<Dayjs | null>(null);
    const [historyToDate, setHistoryToDate] = useState<Dayjs | null>(null);
    const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false);
    const [debouncedCustomer, setDebouncedCustomer] = useState("");
    const [debouncedSeller, setDebouncedSeller] = useState("");
    const [createSaleOpen, setCreateSaleOpen] = useState(false);
    const [detailSale, setDetailSale] = useState<Sale | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
    const [salesListRefreshKey, setSalesListRefreshKey] = useState(0);

    // Open cash form
    const [initialAmount, setInitialAmount] = useState("");
    const [opening, setOpening]             = useState(false);

    // Outflow form
    const [outflowAmount, setOutflowAmount]   = useState("");
    const [outflowDesc, setOutflowDesc]       = useState("");
    const [outflowReason, setOutflowReason]   = useState<number | "">("");
    const [outflowError, setOutflowError]     = useState<string | null>(null);
    const [savingOutflow, setSavingOutflow]   = useState(false);

    // Close dialog
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closingAmount, setClosingAmount]     = useState("");
    const [closing, setClosing]                 = useState(false);
    const [closeResult, setCloseResult]         = useState<CashCloseResult | null>(null);
    const [closeResultOpen, setCloseResultOpen] = useState(false);

    // Snackbar
    const [snackbar, setSnackbar] = useState<SnackState>({ open: false, message: "", severity: "success" });
    const showSnack = (message: string, severity: "success" | "error" | "info" = "success") =>
        setSnackbar({ open: true, message, severity });

    // Real-time difference
    const realtimeDiff = useMemo(() => {
        if (!status || !closingAmount) return null;
        const counted = parseFloat(closingAmount);
        if (isNaN(counted)) return null;
        return counted - status.systemBalance;
    }, [closingAmount, status]);

    const diffColor = realtimeDiff == null
        ? "text.primary"
        : realtimeDiff === 0
            ? "success.main"
            : realtimeDiff < 0
                ? "error.main"
                : "warning.main";

    const selectedId = selectedRegisterId === "" ? null : selectedRegisterId;

    const loadRegisters = useCallback(async () => {
        try {
            const list = await CashService.listRegisters();
            setRegisters(list);
            const stored = getStoredCashRegisterId();
            if (stored != null && list.some((r) => r.id === stored)) {
                setSelectedRegisterId(stored);
            } else if (list.length === 1) {
                setSelectedRegisterId(list[0].id);
                setStoredCashRegisterId(list[0].id);
            }
        } catch {
            setRegisters([]);
        } finally {
            setRegistersLoaded(true);
        }
    }, []);

    const loadGlobalBalance = useCallback(async () => {
        if (selectedId == null) {
            setGlobalBalance(null);
            return;
        }
        try {
            const b = await CashService.getRegisterBalance(selectedId);
            setGlobalBalance(b.balance);
        } catch {
            setGlobalBalance(null);
        }
    }, [selectedId]);

    const loadGlobalSummary = useCallback(async () => {
        try {
            const summary = await CashService.getGlobalSummary();
            setLifetimeSales(summary.totalInflows);
            setLifetimeNetFlow(summary.netFlow);
        } catch {
            setLifetimeSales(null);
            setLifetimeNetFlow(null);
        }
    }, []);

    // ── Load status ────────────────────────────────────────────────────────────
    const loadStatus = useCallback(async () => {
        if (!registersLoaded) return;
        if (selectedId == null) {
            setLoading(false);
            setStatus(null);
            return;
        }
        setLoading(true);
        try {
            const s = await CashService.getStatus(selectedId);
            setStatus(s);
        } catch {
            setStatus(null);
        } finally {
            setLoading(false);
        }
        await Promise.all([loadGlobalBalance(), loadGlobalSummary()]);
    }, [selectedId, registersLoaded, loadGlobalBalance, loadGlobalSummary]);

    const loadReasons = useCallback(async () => {
        try {
            const r = await CashService.getOutflowReasons();
            setReasons(r.filter((x) => x.isActive));
        } catch {
            // non-critical
        }
    }, []);

    // Convenio con el backend: instantes ISO-8601 UTC.
    //   - openedFrom: inicio del día local elegido (inclusivo).
    //   - openedTo: inicio del día SIGUIENTE local (exclusivo), así el filtro incluye
    //     todo el día seleccionado sin tener que lidiar con 23:59:59.999.
    // dayjs resuelve ambos en la zona horaria del navegador y toISOString() los
    // convierte al instante UTC equivalente ("Z"). El backend tiene TZ=UTC.
    const historyOpenedFromStr = useMemo(
        () => (historyFromDate ? historyFromDate.startOf("day").toISOString() : ""),
        [historyFromDate],
    );
    const historyOpenedToStr = useMemo(
        () => (historyToDate ? historyToDate.add(1, "day").startOf("day").toISOString() : ""),
        [historyToDate],
    );

    const historyHasActiveFilters = useMemo(
        () =>
            Boolean(
                historyOpenedFromStr
                || historyOpenedToStr
                || debouncedCustomer.trim()
                || debouncedSeller.trim(),
            ),
        [historyOpenedFromStr, historyOpenedToStr, debouncedCustomer, debouncedSeller],
    );

    /** Al cambiar filtros o paginación, las filas se remontan y vuelven abiertas para ver ventas coincidentes. */
    const historyTableExpandSignal = useMemo(() => {
        if (!historyHasActiveFilters) return "";
        return [
            debouncedCustomer,
            debouncedSeller,
            historyOpenedFromStr,
            historyOpenedToStr,
            String(historyPage),
            String(historyRowsPerPage),
        ].join("\t");
    }, [
        historyHasActiveFilters,
        debouncedCustomer,
        debouncedSeller,
        historyOpenedFromStr,
        historyOpenedToStr,
        historyPage,
        historyRowsPerPage,
    ]);

    const clearHistoryFilters = () => {
        setHistoryCustomerInput("");
        setHistorySellerInput("");
        setHistoryFromDate(null);
        setHistoryToDate(null);
        setDebouncedCustomer("");
        setDebouncedSeller("");
        setHistoryPage(0);
    };

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await CashService.getHistoryPaginated({
                cashRegisterId: selectedId ?? undefined,
                limit:          historyRowsPerPage,
                offset:         historyPage * historyRowsPerPage,
                openedFrom:     historyOpenedFromStr || undefined,
                openedTo:       historyOpenedToStr || undefined,
                customer:       debouncedCustomer.trim() || undefined,
                seller:         debouncedSeller.trim() || undefined,
            });
            setHistory(res.results);
            setHistoryTotal(res.count);
        } catch {
            setHistory([]);
            setHistoryTotal(0);
        } finally {
            setHistoryLoading(false);
        }
    }, [
        selectedId,
        historyPage,
        historyRowsPerPage,
        historyOpenedFromStr,
        historyOpenedToStr,
        debouncedCustomer,
        debouncedSeller,
    ]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedCustomer(historyCustomerInput.trim());
            setDebouncedSeller(historySellerInput.trim());
            setHistoryPage(0);
        }, 400);
        return () => clearTimeout(t);
    }, [historyCustomerInput, historySellerInput]);

    useEffect(() => {
        setHistoryPage(0);
    }, [selectedId, historyOpenedFromStr, historyOpenedToStr]);

    useEffect(() => {
        void loadRegisters();
    }, []);

    useEffect(() => {
        void loadStatus();
        void loadReasons();
    }, [loadStatus, loadReasons]);

    useEffect(() => {
        if (tab !== 1) return;
        void loadHistory();
        void loadGlobalBalance();
        void loadGlobalSummary();
    }, [tab, loadHistory, loadGlobalBalance, loadGlobalSummary]);

    useEffect(() => {
        if (!status) setCreateSaleOpen(false);
    }, [status]);

    const handleSelectRegister = (id: number) => {
        setSelectedRegisterId(id);
        setStoredCashRegisterId(id);
    };

    const handleCreateRegister = async () => {
        const name = newRegisterName.trim();
        if (!name) return;
        setCreatingRegister(true);
        try {
            const row = await CashService.createRegister(name);
            setNewRegisterName("");
            await loadRegisters();
            handleSelectRegister(row.id);
            showSnack(`Caja "${row.name}" creada.`);
        } catch {
            showSnack("No se pudo crear la caja.", "error");
        } finally {
            setCreatingRegister(false);
        }
    };

    // ── Open cash ──────────────────────────────────────────────────────────────
    const handleOpen = async () => {
        const amount = parseFloat(initialAmount);
        if (isNaN(amount) || amount < 0) return;
        setOpening(true);
        try {
            if (selectedId == null) {
                showSnack("Selecciona una caja primero.", "error");
                return;
            }
            const s = await CashService.open({ cashRegisterId: selectedId, initialAmount: amount });
            setStatus(s);
            setInitialAmount("");
            showSnack("Caja abierta exitosamente.");
        } catch {
            showSnack("Error al abrir la caja.", "error");
        } finally {
            setOpening(false);
        }
    };

    // ── Register outflow ───────────────────────────────────────────────────────
    const parsedOutflowAmount = useMemo(() => {
        const t = outflowAmount.trim().replace(",", ".");
        if (t === "" || t === ".") return null;
        const n = parseFloat(t);
        return Number.isFinite(n) ? n : null;
    }, [outflowAmount]);

    const outflowAmountNegative =
        parsedOutflowAmount !== null && parsedOutflowAmount < 0;

    const handleOutflowAmountChange = (raw: string) => {
        if (raw === "") {
            setOutflowAmount("");
            return;
        }
        const noMinus = raw.replace(/^-/, "").replace(/-/g, "");
        setOutflowAmount(noMinus);
    };

    const handleOutflow = async () => {
        const amount = parseFloat(outflowAmount.trim().replace(",", "."));
        if (!outflowReason) {
            setOutflowError("Selecciona un motivo de egreso.");
            return;
        }
        if (Number.isNaN(amount) || outflowAmount.trim() === "") {
            setOutflowError("Indica un monto válido.");
            return;
        }
        if (amount < 0) {
            setOutflowError("El monto no puede ser negativo.");
            return;
        }
        if (amount === 0) {
            setOutflowError("El monto debe ser mayor que cero.");
            return;
        }
        setOutflowError(null);
        setSavingOutflow(true);
        try {
            if (selectedId == null) {
                setOutflowError("Selecciona una caja.");
                return;
            }
            await CashService.createOutflow({
                cashRegisterId: selectedId,
                reasonId:    outflowReason as number,
                amount,
                description: outflowDesc.trim(),
            });
            setOutflowAmount(""); setOutflowDesc(""); setOutflowReason("");
            showSnack("Gasto registrado exitosamente.");
            await loadStatus();
        } catch {
            setOutflowError("Error al registrar el gasto.");
        } finally {
            setSavingOutflow(false);
        }
    };

    // ── Close cash ─────────────────────────────────────────────────────────────
    const handleClose = async () => {
        const amount = parseFloat(closingAmount);
        if (isNaN(amount) || amount < 0) return;
        setClosing(true);
        try {
            if (selectedId == null) {
                showSnack("Selecciona una caja.", "error");
                return;
            }
            const result = await CashService.close({ cashRegisterId: selectedId, closingAmount: amount });
            setCloseResult(result);
            setStatus(null);
            setCloseDialogOpen(false);
            setCloseResultOpen(true);
            setClosingAmount("");
            await Promise.all([loadGlobalBalance(), loadGlobalSummary()]);
            // Refresh history if already loaded
            if (tab === 1) loadHistory();
        } catch {
            showSnack("Error al cerrar la caja.", "error");
        } finally {
            setClosing(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Box>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                <PointOfSaleRoundedIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>Caja</Typography>
            </Box>

            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2, "&:last-child": { pb: 2 } }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        Caja física (punto de venta)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Cada cajera puede tener su propia sesión. Las ventas se registran contra la caja que elijas aquí (botón Crear venta e historial).
                    </Typography>
                    {registers.length === 0 ? (
                        <>
                            <Alert severity="warning">
                                {canCreateRegister
                                    ? "No hay cajas registradas. Crea una con el nombre del mostrador o número de caja."
                                    : "No hay cajas registradas. Contacta al administrador para crear una."}
                            </Alert>
                            {canCreateRegister && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        flexWrap: "wrap",
                                        gap: 2,
                                        alignItems: { xs: "stretch", sm: "flex-end" },
                                        mt: 1,
                                    }}
                                >
                                    <TextField
                                        label="Nombre de la caja"
                                        size="small"
                                        value={newRegisterName}
                                        onChange={(e) => setNewRegisterName(e.target.value)}
                                        sx={{ flex: 1, minWidth: { xs: 0, sm: 200 } }}
                                        fullWidth
                                        placeholder="Ej: Caja 1 — mostrador"
                                    />
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => void handleCreateRegister()}
                                        loading={creatingRegister}
                                        disabled={creatingRegister || !newRegisterName.trim()}
                                        fullWidth
                                        sx={{ flexShrink: 0, width: { sm: "auto" } }}
                                    >
                                        Crear caja
                                    </Button>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", lg: "row" },
                                flexWrap: "wrap",
                                gap: 2,
                                alignItems: { xs: "stretch", lg: "flex-end" },
                            }}
                        >
                            <TextField
                                select
                                label="Caja activa para esta pantalla"
                                size="small"
                                value={selectedRegisterId === "" ? "" : String(selectedRegisterId)}
                                onChange={(e) => handleSelectRegister(Number(e.target.value))}
                                sx={{ minWidth: 0, width: { xs: "100%", lg: 280 } }}
                                fullWidth
                                required
                            >
                                {registers.length > 1 && (
                                    <MenuItem value="" disabled>Selecciona una caja…</MenuItem>
                                )}
                                {registers.map((r) => (
                                    <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>
                                ))}
                            </TextField>
                            {canCreateRegister && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        gap: 2,
                                        alignItems: { xs: "stretch", sm: "flex-end" },
                                        flex: { lg: "1 1 auto" },
                                        minWidth: 0,
                                    }}
                                >
                                    <TextField
                                        label="Nueva caja (nombre)"
                                        size="small"
                                        value={newRegisterName}
                                        onChange={(e) => setNewRegisterName(e.target.value)}
                                        sx={{ flex: 1, minWidth: { xs: 0, sm: 180 } }}
                                        fullWidth
                                        placeholder="Ej: Caja 2 — vitrina"
                                    />
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => void handleCreateRegister()}
                                        loading={creatingRegister}
                                        disabled={creatingRegister || !newRegisterName.trim()}
                                        fullWidth
                                        sx={{ flexShrink: 0, width: { sm: "auto" }, minWidth: { sm: 130 } }}
                                    >
                                        Crear caja
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                    {registers.length > 1 && selectedRegisterId === "" && (
                        <Alert severity="info">Selecciona una caja para ver el turno y el saldo.</Alert>
                    )}
                    {selectedId != null && canCreateSale && (
                        <Box sx={{ mt: 1.5 }}>
                            <Tooltip
                                title={
                                    status
                                        ? ""
                                        : "Abre la caja en «Sesión actual» para registrar ventas."
                                }
                                disableHoverListener={!!status}
                            >
                                <span style={{ display: "block", width: "100%" }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddRoundedIcon />}
                                        onClick={() => setCreateSaleOpen(true)}
                                        disabled={!status}
                                        fullWidth
                                        sx={{ maxWidth: { sm: 360 } }}
                                    >
                                        Crear venta
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Saldo acumulado de la caja seleccionada */}
            <Card variant="outlined" sx={{ mb: 3, bgcolor: "action.hover" }}>
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2, justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, minWidth: 0, flex: "1 1 260px" }}>
                            <AccountBalanceWalletRoundedIcon color="primary" sx={{ mt: 0.25, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Saldo en la caja seleccionada (registro del sistema)
                                </Typography>
                                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
                                    {globalBalance === null ? "…" : currency(globalBalance)}
                                </Typography>
                                <Stack spacing={1} sx={{ mt: 1.25, width: "100%" }}>
                                    <CashDetailRow
                                        label="Ventas acumuladas históricas"
                                        value={lifetimeSales === null ? "…" : currency(lifetimeSales)}
                                    />
                                    <CashDetailRow
                                        label="Flujo neto histórico (ingresos - egresos)"
                                        value={lifetimeNetFlow === null ? "…" : currency(lifetimeNetFlow)}
                                    />
                                </Stack>
                            </Box>
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 720 }}>
                        Cada caja tiene su propio saldo físico. El historial de sesiones (pestaña Historial) puede filtrarse por la caja seleccionada.
                        Las cifras globales de abajo siguen siendo de todo el sistema.
                    </Typography>
                </CardContent>
            </Card>

            {/* Print & Status Alert Banner */}
            {snackbar.open && (
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ mb: 3, borderRadius: 1.5 }}
                >
                    {snackbar.message}
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label="Sesión actual" icon={<PointOfSaleRoundedIcon fontSize="small" />} iconPosition="start" />
                <Tab label="Historial" icon={<HistoryRoundedIcon fontSize="small" />} iconPosition="start" />
            </Tabs>

            {/* ── TAB 0: Sesión actual ──────────────────────────────────────── */}
            {tab === 0 && (
                <>
                    {/* CLOSED: open cash form */}
                    {selectedId != null && !status && (
                        <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
                            <Card variant="outlined" sx={{ width: "100%", maxWidth: 420, p: 1 }}>
                                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <LockOpenRoundedIcon color="action" />
                                        <Typography variant="h6" fontWeight={600}>Abrir caja</Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Ingresa el monto inicial con el que comienza el turno.
                                    </Typography>
                                    <NumericField
                                        label="Monto inicial"
                                        value={initialAmount}
                                        onChange={(e) => setInitialAmount(e.target.value)}
                                        size="small"
                                        fullWidth
                                        allowDecimals={true}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> } }}
                                        inputProps={{ min: 0, step: "0.01" }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleOpen}
                                        loading={opening}
                                        disabled={opening || !initialAmount}
                                        startIcon={<LockOpenRoundedIcon />}
                                        fullWidth
                                    >
                                        Abrir caja
                                    </Button>
                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    {/* OPEN: dashboard */}
                    {status && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {/* Stat cards */}
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                                <StatCard
                                    label="Monto inicial"
                                    value={status.initialAmount}
                                    icon={<AccountBalanceWalletRoundedIcon />}
                                    color="info"
                                />
                                <StatCard
                                    label="Total ventas"
                                    value={status.totalSales}
                                    icon={<TrendingUpRoundedIcon />}
                                    color="success"
                                />
                                <StatCard
                                    label="Total egresos"
                                    value={status.totalOutflows}
                                    icon={<TrendingDownRoundedIcon />}
                                    color="error"
                                />
                                <StatCard
                                    label="Saldo sistema"
                                    value={status.systemBalance}
                                    icon={<PointOfSaleRoundedIcon />}
                                    color="primary"
                                />
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                                {status.cashRegisterName} · Apertura: {fmtDate(status.openedAt)}
                            </Typography>

                            <Divider />

                            {/* Outflow form */}
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                                    Registrar egreso
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        flexWrap: "wrap",
                                        gap: 2,
                                        alignItems: { xs: "stretch", sm: "flex-start" },
                                    }}
                                >
                                    <TextField
                                        label="Motivo"
                                        value={outflowReason}
                                        onChange={(e) => setOutflowReason(Number(e.target.value))}
                                        select
                                        size="small"
                                        fullWidth
                                        sx={{ flex: { sm: "1 1 200px" }, minWidth: { sm: 200 } }}
                                    >
                                        {reasons.map((r) => (
                                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                        ))}
                                    </TextField>
                                    <NumericField
                                        label="Monto"
                                        value={outflowAmount}
                                        onChange={(e) => handleOutflowAmountChange(e.target.value)}
                                        size="small"
                                        fullWidth
                                        allowDecimals={true}
                                        sx={{ width: { xs: "100%", sm: 150 }, flexShrink: 0 }}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> } }}
                                        inputProps={{ min: 0, step: "0.01" }}
                                        error={outflowAmountNegative}
                                        helperText={
                                            outflowAmountNegative
                                                ? "El monto no puede ser negativo"
                                                : undefined
                                        }
                                    />
                                    <TextField
                                        label="Descripción (opcional)"
                                        value={outflowDesc}
                                        onChange={(e) => setOutflowDesc(e.target.value)}
                                        size="small"
                                        fullWidth
                                        sx={{ flex: { sm: "1 1 220px" }, minWidth: { sm: 200 } }}
                                    />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleOutflow}
                                        loading={savingOutflow}
                                        disabled={savingOutflow || outflowAmountNegative}
                                        fullWidth
                                        sx={{ alignSelf: { xs: "stretch", sm: "center" }, width: { xs: "100%", sm: "auto" } }}
                                    >
                                        Registrar gasto
                                    </Button>
                                </Box>
                                {outflowError && (
                                    <Alert severity="error" sx={{ mt: 1.5 }}>{outflowError}</Alert>
                                )}
                                {reasons.length === 0 && (
                                    <Alert severity="info" sx={{ mt: 1.5 }}>
                                        No hay motivos de egreso activos. Crea uno en Configuración para registrar gastos.
                                    </Alert>
                                )}
                            </Box>

                            <Divider />

                            {/* Close button */}
                            <Box>
                                <Button
                                    variant="contained"
                                    color="error"
                                    startIcon={<LockRoundedIcon />}
                                    onClick={() => setCloseDialogOpen(true)}
                                    fullWidth
                                    sx={{ maxWidth: { sm: 360 } }}
                                >
                                    Cerrar caja
                                </Button>
                            </Box>
                        </Box>
                    )}
                </>
            )}

            {/* ── TAB 1: Historial ─────────────────────────────────────────── */}
            {tab === 1 && (
                <>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "stretch",
                        gap: 0,
                        mx: { xs: -1, sm: 0 },
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                alignItems: { xs: "stretch", sm: "center" },
                                justifyContent: "space-between",
                                gap: 1.5,
                                mb: 2,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ flex: "1 1 auto", minWidth: 0 }}>
                                Historial de la caja elegida arriba. Usa <strong>Filtros</strong> para acotar por ventas o fechas de apertura.
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: { xs: "column", sm: "row" },
                                    alignItems: { xs: "stretch", sm: "center" },
                                    gap: { xs: 1, sm: 0 },
                                    flexShrink: 0,
                                    width: { xs: "100%", sm: "auto" },
                                }}
                            >
                                {selectedId != null && canCreateSale && (
                                    <Tooltip
                                        title={
                                            status
                                                ? ""
                                                : "Abre la caja en «Sesión actual» para registrar ventas."
                                        }
                                        disableHoverListener={!!status}
                                    >
                                        <Box
                                            component="span"
                                            sx={{
                                                display: "block",
                                                width: "100%",
                                                sm: { display: "inline-flex", width: "auto", alignItems: "center" },
                                            }}
                                        >
                                            <Button
                                                variant="contained"
                                                startIcon={<AddRoundedIcon />}
                                                onClick={() => setCreateSaleOpen(true)}
                                                disabled={!status}
                                                fullWidth
                                                sx={HISTORY_TOOLBAR_ACTION_SX}
                                            >
                                                Crear venta
                                            </Button>
                                        </Box>
                                    </Tooltip>
                                )}
                                <Button
                                    variant={historyFiltersOpen ? "contained" : "outlined"}
                                    color="primary"
                                    startIcon={<TuneRoundedIcon />}
                                    onClick={() => setHistoryFiltersOpen((o) => !o)}
                                    aria-expanded={historyFiltersOpen}
                                    fullWidth
                                    sx={{
                                        ...HISTORY_TOOLBAR_ACTION_SX,
                                        /** Outlined: el borde “come” aire; un poco más de px que el contained. */
                                        ...(!historyFiltersOpen
                                            ? { px: { xs: 2.75, sm: 5 } }
                                            : {}),
                                    }}
                                    {...(isMdUp ? { "aria-controls": "cash-history-filters-panel" } : {})}
                                >
                                    Filtros
                                </Button>
                            </Box>
                        </Box>
                    {historyLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : historyTotal === 0 ? (
                        <Alert severity="info">
                            {historyHasActiveFilters
                                ? "No hay sesiones que coincidan con los filtros (revisa fechas, cliente o vendedor en las ventas de la sesión)."
                                : "No hay sesiones registradas aún."}
                        </Alert>
                    ) : (
                        <>
                            {isMdUp ? (
                            <TableContainer component={Card} variant="outlined">
                                <CollapsibleTable<CashSessionHistory>
                                    columns={SESSION_COLUMNS}
                                    rows={history}
                                    getRowKey={(s) => s.id}
                                    defaultExpanded={historyHasActiveFilters}
                                    expandSignal={historyTableExpandSignal}
                                    renderExpanded={(s) => (
                                        <SessionSalesPanel
                                            session={s}
                                            listRefreshKey={salesListRefreshKey}
                                            onViewSale={(sale) => {
                                                setDetailSale(sale);
                                                setDetailOpen(true);
                                            }}
                                            onCancelSale={(sale) => {
                                                if (sale.status !== "PENDING" && sale.status !== "PAID") {
                                                    showSnack("Este pedido no se puede cancelar desde aquí.", "error");
                                                    return;
                                                }
                                                setCancelTarget(sale);
                                            }}
                                            cancelling={cancellingSale}
                                            onPrintStatus={(severity, msg) => showSnack(msg, severity)}
                                        />
                                    )}
                                    expandTooltip="Ver ventas de esta sesión"
                                    collapseTooltip="Ocultar ventas"
                                />
                            </TableContainer>
                            ) : (
                                <Stack spacing={1.5}>
                                    {history.map((s) => (
                                        <Accordion
                                            key={`${s.id}-${historyTableExpandSignal}`}
                                            defaultExpanded={historyHasActiveFilters}
                                            disableGutters
                                            elevation={0}
                                            sx={{
                                                border: 1,
                                                borderColor: "divider",
                                                borderRadius: 1,
                                                overflow: "hidden",
                                                "&:before": { display: "none" },
                                            }}
                                        >
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreRoundedIcon />}
                                                sx={{ px: 1.5, alignItems: "flex-start" }}
                                            >
                                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.75, py: 0.5, pr: 1, textAlign: "left" }}>
                                                    <Typography variant="subtitle2" fontWeight={700}>
                                                        {s.cashRegisterName ?? (s.cashRegisterId != null ? `#${s.cashRegisterId}` : "—")}
                                                    </Typography>
                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                                                        <Chip
                                                            label={s.isActive ? "Abierta" : "Cerrada"}
                                                            color={s.isActive ? "success" : "default"}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                                                            Apertura: {fmtDate(s.openedAt)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{ pt: 0, px: 0, bgcolor: "action.hover" }}>
                                                <SessionSalesPanel
                                                    session={s}
                                                    listRefreshKey={salesListRefreshKey}
                                                    onViewSale={(sale) => {
                                                        setDetailSale(sale);
                                                        setDetailOpen(true);
                                                    }}
                                                    onCancelSale={(sale) => {
                                                        if (sale.status !== "PENDING" && sale.status !== "PAID") {
                                                            showSnack("Este pedido no se puede cancelar desde aquí.", "error");
                                                            return;
                                                        }
                                                        setCancelTarget(sale);
                                                    }}
                                                    cancelling={cancellingSale}
                                                    onPrintStatus={(severity, msg) => showSnack(msg, severity)}
                                                />
                                            </AccordionDetails>
                                        </Accordion>
                                    ))}
                                </Stack>
                            )}
                            <TablePagination
                                component="div"
                                count={historyTotal}
                                page={historyPage}
                                onPageChange={(_, p) => setHistoryPage(p)}
                                rowsPerPage={historyRowsPerPage}
                                onRowsPerPageChange={(e) => {
                                    setHistoryRowsPerPage(parseInt(e.target.value, 10));
                                    setHistoryPage(0);
                                }}
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                labelRowsPerPage="Filas"
                                labelDisplayedRows={({ from, to, count }) =>
                                    `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                            />
                        </>
                    )}
                    </Box>

                    <Box
                        id="cash-history-filters-panel"
                        sx={{
                            display: { xs: "none", md: "flex" },
                            flexDirection: "column",
                            width: historyFiltersOpen ? HISTORY_FILTERS_PANEL_PX : 0,
                            flexShrink: 0,
                            alignSelf: "stretch",
                            ml: historyFiltersOpen ? 3 : 0,
                            overflow: "hidden",
                            borderLeft: (theme) =>
                                historyFiltersOpen ? `1px solid ${theme.palette.divider}` : "none",
                            bgcolor: "background.paper",
                            borderRadius: historyFiltersOpen ? 1 : 0,
                            transition: (theme) =>
                                theme.transitions.create(["width", "margin-left"], {
                                    easing: theme.transitions.easing.easeInOut,
                                    duration: theme.transitions.duration.enteringScreen,
                                }),
                        }}
                    >
                        <Box
                            sx={{
                                width: HISTORY_FILTERS_PANEL_PX,
                                boxSizing: "border-box",
                                p: 2,
                                height: "100%",
                                minHeight: 320,
                                display: "flex",
                                flexDirection: "column",
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Filtros
                                </Typography>
                                <Tooltip title="Cerrar">
                                    <IconButton
                                        size="small"
                                        aria-label="Cerrar panel de filtros"
                                        onClick={() => setHistoryFiltersOpen(false)}
                                        edge="end"
                                    >
                                        <CloseRoundedIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box sx={{ flex: 1, overflow: "auto" }}>
                                <CashHistoryFiltersFields
                                    historyCustomerInput={historyCustomerInput}
                                    setHistoryCustomerInput={setHistoryCustomerInput}
                                    historySellerInput={historySellerInput}
                                    setHistorySellerInput={setHistorySellerInput}
                                    historyFromDate={historyFromDate}
                                    setHistoryFromDate={setHistoryFromDate}
                                    historyToDate={historyToDate}
                                    setHistoryToDate={setHistoryToDate}
                                />
                            </Box>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<FilterAltOffRoundedIcon />}
                                onClick={clearHistoryFilters}
                                disabled={
                                    !historyCustomerInput.trim()
                                    && !historySellerInput.trim()
                                    && !historyFromDate
                                    && !historyToDate
                                }
                                fullWidth
                            >
                                Limpiar filtros
                            </Button>
                        </Box>
                    </Box>
                </Box>

                <Dialog
                    open={historyFiltersOpen && !isMdUp}
                    onClose={() => setHistoryFiltersOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    disableRestoreFocus
                    scroll="paper"
                    slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
                >
                    <DialogTitle sx={adminFormDialogTitleRowSx}>
                        <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                            Filtros
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setHistoryFiltersOpen(false)}
                            aria-label="Cerrar"
                        >
                            <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers sx={adminFormDialogContentSx}>
                        <CashHistoryFiltersFields
                            historyCustomerInput={historyCustomerInput}
                            setHistoryCustomerInput={setHistoryCustomerInput}
                            historySellerInput={historySellerInput}
                            setHistorySellerInput={setHistorySellerInput}
                            historyFromDate={historyFromDate}
                            setHistoryFromDate={setHistoryFromDate}
                            historyToDate={historyToDate}
                            setHistoryToDate={setHistoryToDate}
                        />
                    </DialogContent>
                    <DialogActions sx={adminFormDialogActionsSx}>
                        <Button
                            variant="outlined"
                            startIcon={<FilterAltOffRoundedIcon />}
                            onClick={clearHistoryFilters}
                            disabled={
                                !historyCustomerInput.trim()
                                && !historySellerInput.trim()
                                && !historyFromDate
                                && !historyToDate
                            }
                        >
                            Limpiar filtros
                        </Button>
                        <Button variant="contained" onClick={() => setHistoryFiltersOpen(false)}>
                            Aplicar
                        </Button>
                    </DialogActions>
                </Dialog>
                </>
            )}

            {/* ── Close dialog ──────────────────────────────────────────────── */}
            <Dialog
                open={closeDialogOpen}
                onClose={() => !closing && setCloseDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
                scroll="paper"
                slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
            >
                <DialogTitle sx={adminFormDialogTitleRowSx}>
                    <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                        Cerrar caja
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => !closing && setCloseDialogOpen(false)}
                        disabled={closing}
                        aria-label="Cerrar"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ ...adminFormDialogContentSx, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Ingresa el monto real contado en caja. El sistema calculará la diferencia vs el saldo teórico.
                    </Typography>
                    {status && (
                        <Alert severity="info" icon={false}>
                            Saldo sistema: <strong>{currency(status.systemBalance)}</strong>
                        </Alert>
                    )}
                    <NumericField
                        label="Monto contado en caja"
                        value={closingAmount}
                        onChange={(e) => setClosingAmount(e.target.value)}
                        size="small"
                        fullWidth
                        allowDecimals={true}
                        autoFocus
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">S/</InputAdornment> } }}
                        inputProps={{ min: 0, step: "0.01" }}
                    />

                    {/* Real-time difference */}
                    {realtimeDiff !== null && (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                px: 2,
                                py: 1,
                                borderRadius: 1,
                                bgcolor: "action.hover",
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Diferencia
                            </Typography>
                            <Typography variant="body1" fontWeight={700} color={diffColor}>
                                {realtimeDiff >= 0 ? "+" : ""}{currency(realtimeDiff)}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={adminFormDialogActionsSx}>
                    <Button onClick={() => setCloseDialogOpen(false)} disabled={closing}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        loading={closing}
                        disabled={closing || !closingAmount}
                        onClick={handleClose}
                    >
                        Confirmar cierre
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Close result dialog ───────────────────────────────────────── */}
            <Dialog
                open={closeResultOpen}
                onClose={() => { setCloseResultOpen(false); loadHistory(); loadGlobalBalance(); }}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
                scroll="paper"
                slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
            >
                <DialogTitle sx={adminFormDialogTitleRowSx}>
                    <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                        Resumen de cierre
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => { setCloseResultOpen(false); loadHistory(); loadGlobalBalance(); }}
                        aria-label="Cerrar"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ ...adminFormDialogContentSx, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {closeResult && (
                        <>
                            <Row label="Monto inicial"  value={currency(closeResult.initialAmount)} />
                            <Row label="Total ventas"   value={currency(closeResult.totalSales)} />
                            <Row label="Total egresos"  value={currency(closeResult.totalOutflows)} />
                            <Divider />
                            <Row label="Saldo sistema"  value={currency(closeResult.systemBalance)}  bold />
                            <Row label="Monto contado"  value={currency(closeResult.closingAmount)}  bold />
                            <Divider />
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="body2" fontWeight={700}>Diferencia</Typography>
                                <Typography
                                    variant="body1"
                                    fontWeight={700}
                                    color={
                                        closeResult.difference === 0
                                            ? "success.main"
                                            : closeResult.difference < 0
                                                ? "error.main"
                                                : "warning.main"
                                    }
                                >
                                    {closeResult.difference >= 0 ? "+" : ""}{currency(closeResult.difference)}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Cerrada: {fmtDate(closeResult.closedAt)}
                            </Typography>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={adminFormDialogActionsSx}>
                    <Button variant="contained" onClick={() => { setCloseResultOpen(false); loadHistory(); loadGlobalBalance(); }}>
                        Aceptar
                    </Button>
                </DialogActions>
            </Dialog>

            <CreateSale
                open={createSaleOpen}
                onClose={() => setCreateSaleOpen(false)}
                onSuccess={(orderId) => {
                    setCreateSaleOpen(false);
                    showSnack("Venta registrada correctamente.");
                    setSalesListRefreshKey((k) => k + 1);
                    void loadStatus();
                    if (tab === 1) void loadHistory();

                    // Intentar auto-impresión silenciosa o clásica
                    void CashService.printReceipt(orderId, (severity, msg) => {
                        showSnack(msg, severity);
                    });
                }}
            />

            <SaleDetailDialog
                open={detailOpen}
                sale={detailSale}
                onClose={() => {
                    setDetailOpen(false);
                    setDetailSale(null);
                }}
            />

            <Dialog
                open={!!cancelTarget}
                onClose={() => !cancellingSale && setCancelTarget(null)}
                maxWidth="sm"
                fullWidth
                closeAfterTransition={false}
                disableRestoreFocus
                scroll="paper"
                slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
            >
                <DialogTitle sx={adminFormDialogTitleRowSx}>
                    <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                        Cancelar venta
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => !cancellingSale && setCancelTarget(null)}
                        disabled={cancellingSale}
                        aria-label="Cerrar"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={adminFormDialogContentSx}>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                        ¿Deseas cancelar el pedido{" "}
                        <strong>#{cancelTarget?.id}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Se anulará la venta, se restaurará el stock de los productos y, si el pago ya estaba registrado,
                        el sistema procesará el reembolso correspondiente.
                    </Typography>
                    <Alert severity="info" variant="outlined">
                        Esta acción no se puede deshacer desde esta pantalla.
                    </Alert>
                </DialogContent>
                <DialogActions sx={adminFormDialogActionsSx}>
                    <Button onClick={() => setCancelTarget(null)} disabled={cancellingSale}>
                        No, volver
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={async () => {
                            if (!cancelTarget) return;
                            const ok = await cancelSaleExec(cancelTarget.id);
                            setCancelTarget(null);
                            if (ok) {
                                showSnack("Venta cancelada correctamente.");
                                setSalesListRefreshKey((k) => k + 1);
                                void loadHistory();
                                void loadStatus();
                            } else {
                                showSnack("No se pudo cancelar la venta.", "error");
                            }
                        }}
                        disabled={cancellingSale}
                    >
                        Sí, cancelar venta
                    </Button>
                </DialogActions>
            </Dialog>


        </Box>
        </LocalizationProvider>
    );
}
