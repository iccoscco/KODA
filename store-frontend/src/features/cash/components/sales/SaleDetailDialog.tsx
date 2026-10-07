"use client";

import { useState, useEffect } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { SaleService } from "../../services/sale.service";
import { Sale, OrderStatus, PaymentMethod } from "../../types/salesTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import { formatDateTime } from "@/shared/utils/dateFormat";
import {
    adminFormDialogActionsSx,
    adminFormDialogContentSx,
    adminFormDialogPaperSx,
    adminFormDialogTitleRowSx,
} from "@/shared/mui/adminFormDialog";

interface Props {
    open: boolean;
    sale: Sale | null;
    onClose: () => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
    PENDING: "Pendiente",
    PAID: "Pagado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
};

const STATUS_COLOR: Partial<Record<OrderStatus, "default" | "primary" | "success" | "warning" | "error">> = {
    PENDING: "warning",
    PAID: "success",
    SHIPPED: "primary",
    DELIVERED: "success",
    CANCELLED: "error",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    YAPE: "Yape",
    PLIN: "Plin",
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
    CARD: "Tarjeta",
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(value);

const formatDate = (iso: string) => formatDateTime(iso);

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

export default function SaleDetailDialog({ open, sale, onClose }: Props) {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

    const [detail, setDetail] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !sale?.id) {
            setDetail(null);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const d = await SaleService.getSaleById(sale.id);
                if (!cancelled) setDetail(d);
            } catch {
                if (!cancelled) {
                    setError("No se pudo cargar el pedido.");
                    setDetail(sale);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, sale?.id, sale]);

    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        onClose();
    };

    const o = detail ?? sale;
    if (!o) return null;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
            scroll="paper"
            slotProps={{ paper: { sx: adminFormDialogPaperSx } }}
        >
            <DialogTitle sx={adminFormDialogTitleRowSx}>
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, pr: 1 }}>
                    Pedido #{o.id}
                </Typography>
                <IconButton size="small" onClick={handleClose} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={adminFormDialogContentSx}>
                {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
                {loading && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Cargando…
                    </Typography>
                )}

                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        flexWrap: "wrap",
                        gap: { xs: 1.5, sm: 2 },
                        alignItems: { xs: "stretch", sm: "center" },
                        mb: 2,
                    }}
                >
                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                        <strong>Cliente:</strong> {o.shippingAddress?.fullName ?? "—"}
                    </Typography>
                    <Chip
                        size="small"
                        label={STATUS_LABEL[o.status]}
                        color={STATUS_COLOR[o.status] ?? "default"}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        {formatDate(o.createdAt)}
                    </Typography>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{
                            ml: { xs: 0, sm: "auto" },
                            alignSelf: { xs: "flex-end", sm: "center" },
                            width: { xs: "100%", sm: "auto" },
                            textAlign: { xs: "right", sm: "right" },
                        }}
                    >
                        {formatCurrency(o.total)}
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Ítems
                </Typography>

                {isMdUp ? (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width={72}>Imagen</TableCell>
                                <TableCell>Producto</TableCell>
                                <TableCell>Variante</TableCell>
                                <TableCell align="right">Cant.</TableCell>
                                <TableCell align="right">P. unit.</TableCell>
                                <TableCell align="right">Subtotal</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {o.orderItems.map((it) => (
                                <TableRow key={it.id}>
                                    <TableCell>
                                        {it.imageUrl ? (
                                            <Box
                                                component="img"
                                                src={toMediaUrl(it.imageUrl)}
                                                alt=""
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    objectFit: "cover",
                                                    borderRadius: 1,
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{it.productName}</TableCell>
                                    <TableCell>
                                        {(it.colorName ?? "—")} / {(it.sizeName ?? "—")}
                                    </TableCell>
                                    <TableCell align="right">{it.quantity}</TableCell>
                                    <TableCell align="right">{formatCurrency(it.unitPrice)}</TableCell>
                                    <TableCell align="right">{formatCurrency(it.totalPrice)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Stack spacing={1.25}>
                        {o.orderItems.map((it) => (
                            <Paper key={it.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
                                    {it.imageUrl ? (
                                        <Box
                                            component="img"
                                            src={toMediaUrl(it.imageUrl)}
                                            alt=""
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                objectFit: "cover",
                                                borderRadius: 1,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                flexShrink: 0,
                                            }}
                                        />
                                    ) : null}
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight={700}>
                                            {it.productName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {(it.colorName ?? "—")} · {(it.sizeName ?? "—")}
                                        </Typography>
                                    </Box>
                                </Box>
                                <DetailLine label="Cantidad">
                                    <Typography variant="body2" fontWeight={600}>{it.quantity}</Typography>
                                </DetailLine>
                                <DetailLine label="P. unitario">
                                    <Typography variant="body2">{formatCurrency(it.unitPrice)}</Typography>
                                </DetailLine>
                                <DetailLine label="Subtotal">
                                    <Typography variant="body2" fontWeight={700}>
                                        {formatCurrency(it.totalPrice)}
                                    </Typography>
                                </DetailLine>
                            </Paper>
                        ))}
                    </Stack>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Pagos
                </Typography>
                {isMdUp ? (
                    <Stack spacing={0.5}>
                        {o.payments.map((p) => (
                            <Typography key={p.id} variant="body2">
                                {PAYMENT_LABELS[p.method] ?? p.method} — {formatCurrency(p.amount)} ({p.status})
                            </Typography>
                        ))}
                    </Stack>
                ) : (
                    <Stack spacing={1}>
                        {o.payments.map((p) => (
                            <Paper key={p.id} variant="outlined" sx={{ p: 1.25, borderRadius: 1 }}>
                                <DetailLine label="Método">
                                    <Typography variant="body2" fontWeight={600}>
                                        {PAYMENT_LABELS[p.method] ?? p.method}
                                    </Typography>
                                </DetailLine>
                                <DetailLine label="Monto">
                                    <Typography variant="body2" fontWeight={700}>{formatCurrency(p.amount)}</Typography>
                                </DetailLine>
                                <DetailLine label="Estado">
                                    <Typography variant="body2">{p.status}</Typography>
                                </DetailLine>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    ...adminFormDialogActionsSx,
                    "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                }}
            >
                <Button variant="contained" onClick={handleClose}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
