"use client";

import { useEffect, useState } from "react";
import {
    Box, Chip, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { CashService } from "@/features/cash/services/cash.service";
import InlineLoading from "@/shared/components/InlineLoading";
import type { Sale, OrderStatus, PaymentMethod } from "@/features/cash/types/salesTypes";
import { formatDateTime as fmtDate } from "@/shared/utils/dateFormat";

const currency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

const STATUS_LABEL: Record<OrderStatus, string> = {
    PENDING:   "Pendiente",
    PAID:      "Pagado",
    SHIPPED:   "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
};

const STATUS_COLOR: Partial<Record<OrderStatus, "default" | "success" | "warning" | "error" | "primary">> = {
    PENDING:   "warning",
    PAID:      "success",
    SHIPPED:   "primary",
    DELIVERED: "success",
    CANCELLED: "error",
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

export default function ReportSessionSales({ sessionId }: { sessionId: number }) {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

    const [sales, setSales] = useState<Sale[] | null>(null);

    useEffect(() => {
        CashService.getSalesBySession(sessionId)
            .then(setSales)
            .catch(() => setSales([]));
    }, [sessionId]);

    if (sales === null) {
        return (
            <Box sx={{ p: { xs: 0.5, md: 0.5 } }}>
                <InlineLoading />
            </Box>
        );
    }

    if (!sales.length) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                Sin ventas registradas en esta sesión.
            </Typography>
        );
    }

    const total = sales.reduce((a, s) => a + s.total, 0);

    return (
        <Box sx={{ p: { xs: 0.5, md: 0.5 } }}>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 0.5,
                    mb: 1,
                    px: { xs: 0.25, md: 0.5 },
                }}
            >
                <Typography variant="caption" color="success.main" fontWeight={700}>
                    Ventas de la sesión
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Total: <strong>{currency(total)}</strong>
                </Typography>
            </Box>

            {isMdUp ? (
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sales.map((s, i) => (
                            <TableRow key={s.id} hover>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell>{s.shippingAddress?.fullName ?? "—"}</TableCell>
                                <TableCell>{s.userName}</TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={STATUS_LABEL[s.status]}
                                        color={STATUS_COLOR[s.status] ?? "default"}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontSize="0.75rem">
                                        {paymentSummary(s)}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight={600}>{currency(s.total)}</Typography>
                                </TableCell>
                                <TableCell>{fmtDate(s.createdAt)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <Stack spacing={1.25}>
                    {sales.map((s, i) => (
                        <Paper key={s.id} variant="outlined" sx={{ p: 1.25, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                                Venta #{i + 1}
                            </Typography>
                            <DetailLine label="Cliente">
                                <Typography variant="body2" fontWeight={500}>
                                    {s.shippingAddress?.fullName ?? "—"}
                                </Typography>
                            </DetailLine>
                            <DetailLine label="Vendedor">
                                <Typography variant="body2" fontWeight={500}>{s.userName}</Typography>
                            </DetailLine>
                            <DetailLine label="Estado">
                                <Chip
                                    size="small"
                                    label={STATUS_LABEL[s.status]}
                                    color={STATUS_COLOR[s.status] ?? "default"}
                                />
                            </DetailLine>
                            <DetailLine label="Pago">
                                <Typography variant="body2" fontSize="0.8rem">{paymentSummary(s)}</Typography>
                            </DetailLine>
                            <DetailLine label="Total">
                                <Typography variant="body2" fontWeight={700}>{currency(s.total)}</Typography>
                            </DetailLine>
                            <DetailLine label="Fecha">
                                <Typography variant="body2" fontSize="0.8rem">{fmtDate(s.createdAt)}</Typography>
                            </DetailLine>
                        </Paper>
                    ))}
                </Stack>
            )}
        </Box>
    );
}
