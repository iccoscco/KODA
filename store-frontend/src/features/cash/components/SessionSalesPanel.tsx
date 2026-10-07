"use client";

import { useEffect, useState } from "react";
import {
    Box,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { useAuthStore, type AuthState } from "@/store/auth.store";
import { useShallow } from "zustand/react/shallow";
import { PERMISSIONS } from "@/shared/config/permissions";
import { CashService } from "../services/cash.service";
import type { CashSessionHistory, CashOutflow } from "../types/cashTypes";
import type { Sale, OrderStatus, PaymentMethod } from "../types/salesTypes";
import { formatDateTime as fmtDate } from "@/shared/utils/dateFormat";

const currency = (v: number | null | undefined) =>
    v == null
        ? "—"
        : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
    PENDING:   "Pendiente",
    PAID:      "Pagado",
    SHIPPED:   "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
    CASH:     "Efectivo",
    YAPE:     "Yape",
    PLIN:     "Plin",
    TRANSFER: "Transf.",
    CARD:     "Tarjeta",
};

const paymentSummary = (sale: Sale): string => {
    if (!sale.payments?.length) return "—";
    return sale.payments.map((p) => PAYMENT_LABEL[p.method] ?? p.method).join(" + ");
};

const ORDER_STATUS_COLOR: Partial<Record<OrderStatus, "default" | "primary" | "success" | "warning" | "error">> = {
    PENDING:   "warning",
    PAID:      "success",
    SHIPPED:   "primary",
    DELIVERED: "success",
    CANCELLED: "error",
};

const selectOrderPermissions = (s: AuthState) => ({
    canRead:   s.hasPermission(PERMISSIONS.ORDERS.READ),
    canUpdate: s.hasPermission(PERMISSIONS.ORDERS.UPDATE),
});

function canCancelSale(sale: Sale) {
    return sale.status === "PENDING" || sale.status === "PAID";
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, py: 0.35 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Box sx={{ textAlign: "right", minWidth: 0 }}>{children}</Box>
        </Box>
    );
}

interface Props {
    session: CashSessionHistory;
    /** Incrementar tras crear/cancelar venta para recargar la lista de esta sesión. */
    listRefreshKey: number;
    onViewSale: (sale: Sale) => void;
    onCancelSale: (sale: Sale) => void;
    cancelling: boolean;
    onPrintStatus?: (severity: "success" | "error" | "info", message: string) => void;
}

export default function SessionSalesPanel({
    session,
    listRefreshKey,
    onViewSale,
    onCancelSale,
    cancelling,
    onPrintStatus,
}: Props) {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down("md"), { defaultMatches: true });

    const [sales, setSales]             = useState<Sale[] | null>(null);
    const [outflows, setOutflows]       = useState<CashOutflow[] | null>(null);
    const [loading, setLoading]         = useState(true);
    const [mounted, setMounted]         = useState(false);
    const [printingId, setPrintingId]   = useState<number | null>(null);
    const { canRead, canUpdate } = useAuthStore(useShallow(selectOrderPermissions));

    const handlePrintReceipt = (sale: Sale) => {
        setPrintingId(sale.id);
        void CashService.printReceipt(sale.id, (severity, msg) => {
            onPrintStatus?.(severity, msg);
        })
            .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : "No se pudo imprimir el recibo.";
                onPrintStatus?.("error", msg);
            })
            .finally(() => {
                setPrintingId(null);
            });
    };

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            CashService.getSalesBySession(session.id),
            CashService.getOutflowsBySession(session.id),
        ])
            .then(([s, o]) => { setSales(s); setOutflows(o); })
            .catch(() => { setSales([]); setOutflows([]); })
            .finally(() => setLoading(false));
    }, [session.id, listRefreshKey]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    const salesTotal    = sales?.reduce((acc, s) => acc + s.total, 0) ?? 0;
    const outflowsTotal = outflows?.reduce((acc, o) => acc + o.amount, 0) ?? 0;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}>
            <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="subtitle2" color="success.main" fontWeight={700}>
                        Ventas
                    </Typography>
                    {(sales?.length ?? 0) > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            Total: <strong>{currency(salesTotal)}</strong>
                        </Typography>
                    )}
                </Box>
                {!sales?.length ? (
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                        Sin ventas registradas en esta sesión.
                    </Typography>
                ) : isNarrow ? (
                    <Stack spacing={1.25}>
                        {sales.map((sale, i) => (
                            <Paper key={sale.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Venta #{i + 1}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={ORDER_STATUS_LABEL[sale.status]}
                                        color={ORDER_STATUS_COLOR[sale.status] ?? "default"}
                                    />
                                </Box>
                                <DetailLine label="Cliente">
                                    <Typography variant="body2" fontWeight={500}>
                                        {sale.shippingAddress?.fullName ?? "—"}
                                    </Typography>
                                </DetailLine>
                                <DetailLine label="Vendedor">
                                    <Typography variant="body2" fontWeight={500}>{sale.userName}</Typography>
                                </DetailLine>
                                <DetailLine label="Pago">
                                    <Typography variant="body2" fontSize="0.8rem">
                                        {paymentSummary(sale)}
                                    </Typography>
                                </DetailLine>
                                <DetailLine label="Total">
                                    <Typography variant="body2" fontWeight={700}>
                                        {currency(sale.total)}
                                    </Typography>
                                </DetailLine>
                                <DetailLine label="Fecha">
                                    <Typography variant="body2" fontSize="0.8rem">
                                        {fmtDate(sale.createdAt)}
                                    </Typography>
                                </DetailLine>
                                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25, flexWrap: "wrap", mt: 1 }}>
                                    {mounted && canRead && (
                                        <Tooltip title="Ver detalle">
                                            <IconButton size="small" onClick={() => onViewSale(sale)}>
                                                <VisibilityRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {mounted && canRead && (
                                        <Tooltip title="Imprimir recibo">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handlePrintReceipt(sale)}
                                                    disabled={printingId === sale.id}
                                                >
                                                    <PrintRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    {mounted && canUpdate && canCancelSale(sale) && sale.status !== "CANCELLED" && (
                                        <Tooltip title="Cancelar venta">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => onCancelSale(sale)}
                                                    disabled={cancelling}
                                                >
                                                    <HighlightOffRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                </Box>
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Cliente</TableCell>
                                <TableCell>Vendedor</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell>Pago</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Fecha</TableCell>
                                <TableCell align="center" width={100}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sales.map((sale, i) => (
                                <TableRow key={sale.id} hover>
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>{sale.shippingAddress?.fullName ?? "—"}</TableCell>
                                    <TableCell>{sale.userName}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={ORDER_STATUS_LABEL[sale.status]}
                                            color={ORDER_STATUS_COLOR[sale.status] ?? "default"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontSize="0.75rem">
                                            {paymentSummary(sale)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={600}>
                                            {currency(sale.total)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{fmtDate(sale.createdAt)}</TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.25 }}>
                                            {mounted && canRead && (
                                                <Tooltip title="Ver detalle">
                                                    <IconButton size="small" onClick={() => onViewSale(sale)}>
                                                        <VisibilityRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {mounted && canRead && (
                                                <Tooltip title="Imprimir recibo">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="info"
                                                            onClick={() => handlePrintReceipt(sale)}
                                                            disabled={printingId === sale.id}
                                                        >
                                                            <PrintRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                            {mounted && canUpdate && canCancelSale(sale) && sale.status !== "CANCELLED" && (
                                                <Tooltip title="Cancelar venta">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => onCancelSale(sale)}
                                                            disabled={cancelling}
                                                        >
                                                            <HighlightOffRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>

            <Divider />

            <Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="subtitle2" color="error.main" fontWeight={700}>
                        Egresos
                    </Typography>
                    {(outflows?.length ?? 0) > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            Total: <strong>{currency(outflowsTotal)}</strong>
                        </Typography>
                    )}
                </Box>
                {!outflows?.length ? (
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
                        Sin egresos registrados en esta sesión.
                    </Typography>
                ) : isNarrow ? (
                    <Stack spacing={1}>
                        {outflows.map((o, i) => (
                            <Paper key={o.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                                    Egreso #{i + 1}
                                </Typography>
                                <DetailLine label="Motivo">
                                    <Typography variant="body2" fontWeight={500}>{o.reasonName}</Typography>
                                </DetailLine>
                                <DetailLine label="Descripción">
                                    <Typography variant="body2" fontSize="0.85rem">{o.description || "—"}</Typography>
                                </DetailLine>
                                <DetailLine label="Monto">
                                    <Typography variant="body2" fontWeight={700} color="error.main">
                                        -{currency(o.amount)}
                                    </Typography>
                                </DetailLine>
                                <DetailLine label="Fecha">
                                    <Typography variant="body2" fontSize="0.8rem">{fmtDate(o.createdAt)}</Typography>
                                </DetailLine>
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>Motivo</TableCell>
                                <TableCell>Descripción</TableCell>
                                <TableCell align="right">Monto</TableCell>
                                <TableCell>Fecha</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {outflows.map((o, i) => (
                                <TableRow key={o.id} hover>
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell>{o.reasonName}</TableCell>
                                    <TableCell>{o.description || "—"}</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={600} color="error.main">
                                            -{currency(o.amount)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{fmtDate(o.createdAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>


        </Box>
    );
}
