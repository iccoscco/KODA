'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    Paper,
    Skeleton,
    Typography,
    Tooltip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import InventoryRoundedIcon from "@mui/icons-material/Inventory2Rounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ArrowCircleUpRoundedIcon from "@mui/icons-material/ArrowCircleUpRounded";
import ArrowCircleDownRoundedIcon from "@mui/icons-material/ArrowCircleDownRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";

import { ProductService } from "../services/products.service";
import { Product, StockMovement } from "../types/productsTypes";
import { formatDateTime as fmtDateTime } from "@/shared/utils/dateFormat";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import { ImageLightbox, VariantImageThumb } from "./variantImageUi";
import EditProduct from "./EditProduct";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";

interface Props {
    id: number;
}

const currency = (value: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(value);

const translateReason = (reason: string) => {
    switch (reason) {
        case "SALE":
            return "Venta";
        case "CANCELLED_SALE":
            return "Venta Cancelada (Devolución)";
        case "MANUAL_ADD":
            return "Adición Manual";
        case "MANUAL_SUBTRACT":
            return "Retiro Manual";
        case "STOCK_UPDATE":
            return "Ajuste de Stock";
        default:
            return reason;
    }
};

export default function ProductDetails({ id }: Props) {
    const router = useRouter();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const [product, setProduct] = useState<Product | null>(null);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [movementsLoading, setMovementsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);
    const [editProductOpen, setEditProductOpen] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [selectedVariantFilter, setSelectedVariantFilter] = useState<number | "ALL">("ALL");

    // Paginación para movimientos
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const canUpdate = useHasPermission(PERMISSIONS.PRODUCTS.UPDATE);

    const fetchProductDetails = useCallback(() => {
        if (!id) return;
        setLoading(true);
        setError(null);
        ProductService.getProduct(id)
            .then((res) => {
                setProduct(res);
                setLoading(false);
            })
            .catch((err) => {
                console.error("[ProductDetails - getProduct]", err);
                setError("No se pudo cargar la información del producto.");
                setLoading(false);
            });
    }, [id]);

    const fetchStockMovements = useCallback(() => {
        if (!id) return;
        setMovementsLoading(true);
        ProductService.getStockMovements(id)
            .then((res) => {
                setMovements(res);
            })
            .catch((err) => {
                console.error("[ProductDetails - getStockMovements]", err);
            })
            .finally(() => {
                setMovementsLoading(false);
            });
    }, [id]);

    useEffect(() => {
        fetchProductDetails();
        fetchStockMovements();
    }, [fetchProductDetails, fetchStockMovements]);

    const handleBack = () => {
        router.push("/products");
    };

    const handleEditProduct = () => {
        setEditProductOpen(true);
    };

    const handleProductUpdated = () => {
        fetchProductDetails();
        fetchStockMovements();
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const activeVariants = useMemo(
        () => (product?.variants ?? []).filter((v) => v.isActive),
        [product]
    );

    const buildVariantLabelForSelect = (v: any) => {
        const parts = [];
        if (v.colorName) parts.push(v.colorName);
        if (v.sizeName) parts.push(v.sizeName);
        const label = parts.join(" / ") || "Variante única";
        return v.sku ? `${label} (SKU: ${v.sku})` : label;
    };

    const kardexMovements = useMemo(() => {
        if (!product || movements.length === 0) return [];

        const filtered = selectedVariantFilter === "ALL"
            ? movements
            : movements.filter((m) => m.productVariantId === selectedVariantFilter);

        // 1. Ordenar cronológicamente (ascendente) para el cálculo acumulado
        const sorted = [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        let runningQty = 0;
        let runningVal = 0;
        
        let baseCost = product.purchasePrice || 0;
        if (selectedVariantFilter !== "ALL") {
            const v = product.variants.find((varItem) => varItem.id === selectedVariantFilter);
            if (v && v.purchasePrice != null) {
                baseCost = v.purchasePrice;
            }
        }
        let currentAvgCost = baseCost;

        const calculated = sorted.map((m) => {
            const variant = product.variants.find((v) => v.id === m.productVariantId);
            const purchaseCost = m.unitCost ?? variant?.purchasePrice ?? product.purchasePrice ?? 0;
            
            const isInput = m.type === "INPUT";
            let cu = 0;
            let total = 0;
            let prevQty = runningQty;
            let prevVal = runningVal;

            if (isInput) {
                cu = purchaseCost;
                total = m.quantity * cu;
                runningQty = prevQty + m.quantity;
                runningVal = prevVal + total;
                currentAvgCost = runningQty > 0 ? runningVal / runningQty : cu;
            } else {
                cu = currentAvgCost;
                total = m.quantity * cu;
                runningQty = prevQty - m.quantity;
                runningVal = prevVal - total;
                if (runningQty < 0) {
                    runningQty = 0;
                    runningVal = 0;
                }
            }

            return {
                ...m,
                cu,
                total,
                saldoCant: runningQty,
                saldoVal: runningVal,
            };
        });

        // 2. Invertir para mostrar el más reciente al inicio
        return calculated.reverse();
    }, [movements, product, selectedVariantFilter]);

    const paginatedMovements = useMemo(() => {
        return kardexMovements.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [kardexMovements, page, rowsPerPage]);

    if (loading) {
        return (
            <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" width="40%" height={32} />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (error || !product) {
        return (
            <Box sx={{ p: 3 }}>
                <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={handleBack}
                    sx={{ mb: 3 }}
                >
                    Volver a productos
                </Button>
                <Alert severity="error">
                    {error || "No se encontró el producto seleccionado."}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, pb: 6 }}>
            {/* Header Navigation */}
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton onClick={handleBack} aria-label="Volver">
                        <ArrowBackRoundedIcon />
                    </IconButton>
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {product.name}
                            </Typography>
                            {product.isFeatured && (
                                <Tooltip title="Producto Destacado">
                                    <Chip
                                        label="Destacado"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        icon={<StarRoundedIcon sx={{ color: "warning.main" }} />}
                                        sx={{ fontWeight: 700 }}
                                    />
                                </Tooltip>
                            )}
                            <Chip
                                label={product.isActive ? "Activo" : "Inactivo"}
                                size="small"
                                color={product.isActive ? "success" : "error"}
                                variant="outlined"
                                icon={product.isActive ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
                                sx={{ fontWeight: 600 }}
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            Detalles completos del producto, variantes e historial de inventario
                        </Typography>
                    </Box>
                </Box>

                {canUpdate && (
                    <Button
                        variant="contained"
                        startIcon={<EditRoundedIcon />}
                        onClick={handleEditProduct}
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 750,
                            px: 3,
                            py: 1,
                            boxShadow: "none",
                            bgcolor: "primary.main",
                            "&:hover": {
                                bgcolor: "primary.dark",
                                boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.2)}`,
                            }
                        }}
                    >
                        Editar Producto
                    </Button>
                )}
            </Box>

            {/* Product general details */}
            <Grid container spacing={3}>
                {/* General Info Card */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 3,
                            height: "100%",
                            borderRadius: 3,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            borderColor: (t) => alpha(t.palette.divider, 0.2),
                            bgcolor: (t) =>
                                t.palette.mode === "dark"
                                    ? alpha(t.palette.background.paper, 0.55)
                                    : t.palette.background.paper,
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={700} color="primary" gutterBottom>
                            Información General
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Nombre del Producto
                                </Typography>
                                <Typography variant="body1" fontWeight={600} gutterBottom>
                                    {product.name}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Categoría
                                </Typography>
                                <Typography variant="body1" fontWeight={600} gutterBottom>
                                    {product.categoryName}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 6, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Stock Mínimo Base
                                </Typography>
                                <Typography variant="body2" fontWeight={500} color="text.primary">
                                    {product.minStock} unidades
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 6, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Total Vendidos
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {product.totalSold ?? 0} unidades
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Fecha de Registro
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {fmtDateTime(product.createdAt)}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Última Actualización
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {fmtDateTime(product.updatedAt)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Pricing Card */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 3,
                            height: "100%",
                            borderRadius: 3,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2.5,
                            borderColor: (t) => alpha(t.palette.divider, 0.2),
                            bgcolor: (t) =>
                                t.palette.mode === "dark"
                                    ? alpha(t.palette.background.paper, 0.55)
                                    : t.palette.background.paper,
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={700} color="primary">
                            Precios de Referencia (Base)
                        </Typography>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Costo de Compra Base
                                </Typography>
                                <Typography variant="h6" fontWeight={700} color="text.primary">
                                    {currency(product.purchasePrice)}
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Precio de Venta Base
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="primary.main">
                                    {currency(product.salePrice)}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                Margen de Utilidad Estimado (Base)
                            </Typography>
                            {product.salePrice > 0 ? (
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="body1" fontWeight={700} color="success.main">
                                        {currency(product.salePrice - product.purchasePrice)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        ({(((product.salePrice - product.purchasePrice) / product.salePrice) * 100).toFixed(1)}% margen)
                                    </Typography>
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    N/A
                                </Typography>
                            )}
                        </Box>

                        {product.discountPercentage && product.discountPercentage > 0 ? (
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.warning.main, 0.08), border: "1px dashed", borderColor: "warning.main" }}>
                                <Typography variant="caption" color="warning.dark" fontWeight={700} display="block">
                                    Descuento Activo Base: {product.discountPercentage}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Vigente del {fmtDateTime(product.discountStart || "")} al {fmtDateTime(product.discountEnd || "")}
                                </Typography>
                            </Box>
                        ) : null}
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, val) => setTabValue(val)}
                    aria-label="Información de variantes e historial"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '1rem',
                        }
                    }}
                >
                    <Tab label={`Variantes Activas (${activeVariants.length})`} />
                    <Tab label={`Historial de Movimientos (${movements.length})`} />
                </Tabs>
            </Box>

            {tabValue === 0 && (
                <Box>
                    {activeVariants.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Este producto no tiene variantes registradas o activas actualmente.
                        </Alert>
                    ) : (
                        <Grid container spacing={2}>
                            {activeVariants.map((variant) => {
                                const finalSale = variant.salePrice ?? product.salePrice;
                                const finalPurchase = variant.purchasePrice ?? product.purchasePrice;
                                const hasPriceOverride = variant.salePrice != null || variant.purchasePrice != null;

                                let stockColor = "success";
                                let stockTooltip = "Stock adecuado";
                                if (variant.stock <= 0) {
                                    stockColor = "error";
                                    stockTooltip = "Sin Stock (Agotado)";
                                } else if (variant.stock <= variant.minStock) {
                                    stockColor = "error";
                                    stockTooltip = `Bajo stock (Mínimo de variante: ${variant.minStock})`;
                                } else if (variant.stock <= variant.minStock + 5) {
                                    stockColor = "warning";
                                    stockTooltip = "Stock próximo al mínimo";
                                }

                                return (
                                    <Grid key={variant.id} size={12}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                border: "1px solid",
                                                borderColor: (t) => alpha(t.palette.divider, 0.15),
                                                borderRadius: 2.5,
                                                bgcolor: (t) =>
                                                    t.palette.mode === "dark"
                                                        ? alpha(t.palette.background.paper, 0.15)
                                                        : alpha(t.palette.background.paper, 0.6),
                                                display: "flex",
                                                flexDirection: { xs: "column", md: "row" },
                                                alignItems: { xs: "flex-start", md: "center" },
                                                justifyContent: "space-between",
                                                gap: 2,
                                            }}
                                        >
                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ flex: 1 }}>
                                                {/* Color */}
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                    <Tooltip title={`Color: ${variant.colorName ?? "Sin color"}`}>
                                                        <Box
                                                            sx={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: "50%",
                                                                bgcolor: variant.colorHexCode || "#bdbdbd",
                                                                border: "2px solid",
                                                                borderColor: "background.paper",
                                                                boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    </Tooltip>
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {variant.colorName ?? "Sin color"}
                                                    </Typography>
                                                </Box>

                                                {/* Size Badge */}
                                                <Chip
                                                    label={`Talla: ${variant.sizeName ?? "Única"}`}
                                                    size="small"
                                                    variant="filled"
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: "0.75rem",
                                                        bgcolor: (t) =>
                                                            t.palette.mode === "dark"
                                                                ? alpha(t.palette.background.default, 0.6)
                                                                : alpha(t.palette.grey[100], 1),
                                                    }}
                                                />

                                                {/* SKU Badge */}
                                                <Chip
                                                    label={variant.sku ? `SKU: ${variant.sku}` : "Sin SKU"}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        height: 24,
                                                        fontSize: "0.75rem",
                                                        fontWeight: 700,
                                                        borderColor: "divider",
                                                        color: variant.sku ? "text.secondary" : "text.disabled",
                                                        borderStyle: variant.sku ? "solid" : "dashed",
                                                    }}
                                                />

                                                {/* Stock Chip */}
                                                <Tooltip title={stockTooltip}>
                                                    <Chip
                                                        label={`Stock: ${variant.stock}`}
                                                        size="small"
                                                        color={stockColor as "success" | "warning" | "error"}
                                                        variant="outlined"
                                                        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                                    />
                                                </Tooltip>

                                                {/* Stock Mínimo Badge */}
                                                <Tooltip title={`Stock mínimo configurado para esta variante: ${variant.minStock ?? 5}`}>
                                                    <Chip
                                                        label={`Mín. Stock: ${variant.minStock ?? 5}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700, borderColor: "divider", color: "text.secondary" }}
                                                    />
                                                </Tooltip>

                                                 {/* Ver Kardex de esta variante */}
                                                <Tooltip title="Ver historial de movimientos (Kardex)">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => {
                                                            setSelectedVariantFilter(variant.id);
                                                            setTabValue(1);
                                                            setPage(0);
                                                        }}
                                                        sx={{
                                                            height: 24,
                                                            width: 24,
                                                            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                                                            '&:hover': {
                                                                bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                                                            }
                                                        }}
                                                    >
                                                        <HistoryRoundedIcon sx={{ fontSize: "1.1rem" }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>

                                            {/* Pricing & Images */}
                                            <Stack
                                                direction={{ xs: "column", sm: "row" }}
                                                spacing={{ xs: 2, sm: 3.5 }}
                                                alignItems={{ xs: "flex-start", sm: "center" }}
                                                sx={{
                                                    alignSelf: { xs: "stretch", md: "auto" },
                                                    justifyContent: { xs: "space-between", md: "flex-end" },
                                                    pl: { xs: 0, md: 2 },
                                                    width: { xs: "100%", md: "auto" },
                                                }}
                                            >
                                                {/* Prices */}
                                                <Stack
                                                    direction="row"
                                                    spacing={4}
                                                    sx={{
                                                        width: { xs: "100%", sm: "auto" },
                                                        justifyContent: { xs: "space-between", sm: "flex-start" },
                                                    }}
                                                >
                                                    <Box>
                                                        <Tooltip title={variant.purchasePrice != null ? "Precio de compra propio configurado para esta variante" : "Precio de compra heredado del producto base (referencial)"}>
                                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ cursor: "help" }}>
                                                                Costo Compra
                                                            </Typography>
                                                        </Tooltip>
                                                        <Typography variant="body2" fontWeight={variant.purchasePrice != null ? 700 : 500} color={variant.purchasePrice != null ? "text.primary" : "text.secondary"}>
                                                            {currency(finalPurchase)}{" "}
                                                            <Box component="span" sx={{ fontSize: "0.7rem", color: variant.purchasePrice != null ? "success.main" : "text.disabled", fontWeight: 700, ml: 0.5 }}>
                                                                {variant.purchasePrice != null ? "(Propio)" : "(Ref.)"}
                                                            </Box>
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        <Tooltip title={variant.salePrice != null ? "Precio de venta propio configurado para esta variante" : "Precio de venta heredado del producto base (referencial)"}>
                                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ cursor: "help" }}>
                                                                Precio Venta
                                                            </Typography>
                                                        </Tooltip>
                                                        <Typography variant="body2" fontWeight={700} color={variant.salePrice != null ? "primary.main" : "text.secondary"}>
                                                            {currency(finalSale)}{" "}
                                                            <Box component="span" sx={{ fontSize: "0.7rem", color: variant.salePrice != null ? "primary.main" : "text.disabled", fontWeight: 700, ml: 0.5 }}>
                                                                {variant.salePrice != null ? "(Propio)" : "(Ref.)"}
                                                            </Box>
                                                        </Typography>
                                                    </Box>
                                                </Stack>

                                                {/* Images */}
                                                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: { xs: 0.5, sm: 0 }, alignSelf: { xs: "flex-start", sm: "auto" } }}>
                                                    {(variant.images ?? []).length === 0 ? (
                                                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                                                            Sin fotos
                                                        </Typography>
                                                    ) : (
                                                        (variant.images ?? []).map((img) => {
                                                            const src = toMediaUrl(img.url);
                                                            const alt = `Variante SKU: ${variant.sku ?? variant.id} — imagen`;
                                                            return (
                                                                <VariantImageThumb
                                                                    key={img.id}
                                                                    src={src}
                                                                    alt={alt}
                                                                    size={44}
                                                                    isMain={img.isMain}
                                                                    emphasized={img.isMain}
                                                                    onExpand={() => setImageLightbox({ src, alt })}
                                                                />
                                                            );
                                                        })
                                                    )}
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </Box>
            )}

            {tabValue === 1 && (
                <Box>
                    {/* Header and Filter Dropdown */}
                    {movements.length > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
                            <Typography variant="h6" fontWeight={750}>
                                Kardex de Inventario
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: 260 }}>
                                <InputLabel id="variant-filter-label">Filtrar por variante</InputLabel>
                                <Select
                                    labelId="variant-filter-label"
                                    id="variant-filter"
                                    value={selectedVariantFilter}
                                    label="Filtrar por variante"
                                    onChange={(e) => {
                                        setSelectedVariantFilter(e.target.value as number | "ALL");
                                        setPage(0);
                                    }}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="ALL">
                                        Todas las variantes
                                    </MenuItem>
                                    {(product?.variants ?? []).filter(v => v.isActive).map((v) => (
                                        <MenuItem key={v.id} value={v.id}>
                                            {buildVariantLabelForSelect(v)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {movementsLoading && movements.length === 0 ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <CircularProgress size={26} />
                        </Box>
                    ) : movements.length === 0 ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 5,
                                textAlign: "center",
                                borderRadius: 3,
                                borderColor: (t) => alpha(t.palette.divider, 0.15),
                                bgcolor: (t) => alpha(t.palette.action.hover, 0.1),
                            }}
                        >
                            <InventoryRoundedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1.5 }} />
                            <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
                                Sin movimientos de stock
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: "auto" }}>
                                Aún no se han registrado transacciones de ingreso o salida de stock para este producto.
                            </Typography>
                        </Paper>
                    ) : kardexMovements.length === 0 ? (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 5,
                                textAlign: "center",
                                borderRadius: 3,
                                borderColor: (t) => alpha(t.palette.divider, 0.15),
                                bgcolor: (t) => alpha(t.palette.action.hover, 0.1),
                            }}
                        >
                            <InventoryRoundedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1.5 }} />
                            <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
                                Sin movimientos para esta variante
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: "auto" }}>
                                No se han registrado movimientos de stock específicos para la variante seleccionada.
                            </Typography>
                        </Paper>
                    ) : (
                        <>
                        <Paper variant="outlined" sx={{ display: { xs: "none", md: "block" }, borderRadius: 3, overflow: "hidden", borderColor: (t) => alpha(t.palette.divider, 0.2) }}>
                            <TableContainer>
                                <Table sx={{ minWidth: 850 }}>
                                    <TableHead sx={{ bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.background.paper, 0.2) : alpha(t.palette.action.hover, 0.1) }}>
                                        <TableRow>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 750, verticalAlign: "middle" }}>Fecha y Hora</TableCell>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 750, verticalAlign: "middle" }}>Variante</TableCell>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 750, verticalAlign: "middle" }}>Detalle / Motivo</TableCell>
                                            <TableCell colSpan={3} align="center" sx={{ fontWeight: 750, bgcolor: (t) => alpha(t.palette.success.main, 0.08), borderBottom: "1px solid", borderColor: (t) => alpha(t.palette.divider, 0.1) }}>Entradas</TableCell>
                                            <TableCell colSpan={3} align="center" sx={{ fontWeight: 750, bgcolor: (t) => alpha(t.palette.error.main, 0.08), borderBottom: "1px solid", borderColor: (t) => alpha(t.palette.divider, 0.1) }}>Salidas (Ventas / Retiros)</TableCell>
                                            <TableCell colSpan={2} align="center" sx={{ fontWeight: 750, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), borderBottom: "1px solid", borderColor: (t) => alpha(t.palette.divider, 0.1) }}>Saldos (Stock)</TableCell>
                                            <TableCell rowSpan={2} sx={{ fontWeight: 750, verticalAlign: "middle" }}>Responsable</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            {/* Entradas */}
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.success.main, 0.03) }}>Cant.</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.success.main, 0.03) }}>C.U.</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.success.main, 0.03) }}>Total</TableCell>
                                            {/* Salidas */}
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.error.main, 0.03) }}>Cant.</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.error.main, 0.03) }}>C.U.</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.error.main, 0.03) }}>Total</TableCell>
                                            {/* Saldos */}
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.primary.main, 0.03) }}>Cant.</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.primary.main, 0.03) }}>Val. Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedMovements.map((m) => {
                                            const isInput = m.type === "INPUT";
                                            return (
                                                <TableRow
                                                    key={m.id}
                                                    hover
                                                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                                                >
                                                    <TableCell>{fmtDateTime(m.createdAt)}</TableCell>
                                                    <TableCell sx={{ fontWeight: 500 }}>{m.variantLabel}</TableCell>
                                                    <TableCell>{translateReason(m.reason)}</TableCell>
                                                    
                                                    {/* Entradas */}
                                                    <TableCell align="right" sx={{ bgcolor: (t) => isInput ? alpha(t.palette.success.main, 0.01) : "transparent", fontWeight: isInput ? 700 : 400, color: isInput ? "success.main" : "text.disabled" }}>
                                                        {isInput ? `+${m.quantity}` : "—"}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ bgcolor: (t) => isInput ? alpha(t.palette.success.main, 0.01) : "transparent", color: isInput ? "success.main" : "text.disabled" }}>
                                                        {isInput ? currency(m.cu) : "—"}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ bgcolor: (t) => isInput ? alpha(t.palette.success.main, 0.01) : "transparent", fontWeight: isInput ? 700 : 400, color: isInput ? "success.main" : "text.disabled" }}>
                                                        {isInput ? currency(m.total) : "—"}
                                                    </TableCell>

                                                    {/* Salidas */}
                                                    <TableCell align="right" sx={{ bgcolor: (t) => !isInput ? alpha(t.palette.error.main, 0.01) : "transparent", fontWeight: !isInput ? 700 : 400, color: !isInput ? "error.main" : "text.disabled" }}>
                                                        {!isInput ? `-${m.quantity}` : "—"}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ bgcolor: (t) => !isInput ? alpha(t.palette.error.main, 0.01) : "transparent", color: !isInput ? "error.main" : "text.disabled" }}>
                                                        {!isInput ? currency(m.cu) : "—"}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ bgcolor: (t) => !isInput ? alpha(t.palette.error.main, 0.01) : "transparent", fontWeight: !isInput ? 700 : 400, color: !isInput ? "error.main" : "text.disabled" }}>
                                                        {!isInput ? currency(m.total) : "—"}
                                                    </TableCell>

                                                    {/* Saldos */}
                                                    <TableCell align="right" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.02), fontWeight: 700 }}>
                                                        {m.saldoCant}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.02), fontWeight: 700, color: "primary.main" }}>
                                                        {currency(m.saldoVal)}
                                                    </TableCell>

                                                    <TableCell sx={{ color: "text.secondary" }}>{m.userName || "Sistema"}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={kardexMovements.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                labelRowsPerPage="Filas por página:"
                                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
                            />
                        </Paper>

                        {/* Mobile View */}
                        <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 2 }}>
                            {paginatedMovements.map((m) => {
                                const isInput = m.type === "INPUT";
                                const reasonText = translateReason(m.reason);
                                
                                return (
                                    <Paper
                                        key={m.id}
                                        variant="outlined"
                                        sx={{
                                            p: 2.25,
                                            borderRadius: 3,
                                            borderColor: (t) => alpha(t.palette.divider, 0.15),
                                            bgcolor: (t) => t.palette.mode === "dark" 
                                                ? alpha(t.palette.common.white, 0.01) 
                                                : alpha(t.palette.common.black, 0.01),
                                        }}
                                    >
                                        {/* Header: Fecha & Responsable */}
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                                {fmtDateTime(m.createdAt)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.common.white, 0.05) : alpha(t.palette.common.black, 0.04), px: 1, py: 0.25, borderRadius: 1.5 }}>
                                                Resp: {m.userName || "Sistema"}
                                            </Typography>
                                        </Box>

                                        {/* Variant Info */}
                                        <Box sx={{ mb: 1.5 }}>
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                {m.variantLabel}
                                            </Typography>
                                        </Box>

                                        {/* Motivo & Transacción */}
                                        <Box sx={{ 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            p: 1.5, 
                                            borderRadius: 2, 
                                            bgcolor: (t) => isInput ? alpha(t.palette.success.main, 0.04) : alpha(t.palette.error.main, 0.04),
                                            border: "1px solid",
                                            borderColor: (t) => isInput ? alpha(t.palette.success.main, 0.1) : alpha(t.palette.error.main, 0.1),
                                            mb: 2
                                        }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                {isInput ? (
                                                    <ArrowCircleUpRoundedIcon color="success" sx={{ fontSize: 22 }} />
                                                ) : (
                                                    <ArrowCircleDownRoundedIcon color="error" sx={{ fontSize: 22 }} />
                                                )}
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700} color={isInput ? "success.main" : "error.main"}>
                                                        {reasonText}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        C.U. {currency(m.cu)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ textAlign: "right" }}>
                                                <Typography variant="subtitle1" fontWeight={800} color={isInput ? "success.main" : "error.main"}>
                                                    {isInput ? `+${m.quantity}` : `-${m.quantity}`}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" fontWeight={500}>
                                                    Total: {currency(m.total)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Saldos */}
                                        <Box sx={{ 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            pt: 1.5, 
                                            borderTop: "1px dashed", 
                                            borderColor: "divider" 
                                        }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Stock restante</Typography>
                                                <Typography variant="body2" fontWeight={700}>{m.saldoCant} uds.</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: "right" }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Valoración total</Typography>
                                                <Typography variant="body2" fontWeight={700} color="primary.main">{currency(m.saldoVal)}</Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                );
                            })}
                            
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={kardexMovements.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                labelRowsPerPage="Filas:"
                                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
                                sx={{
                                    "& .MuiTablePagination-toolbar": {
                                        px: 1,
                                        flexWrap: "wrap",
                                        justifyContent: "center",
                                        gap: 1
                                    }
                                }}
                            />
                        </Box>
                        </>
                    )}
                </Box>
            )}

            {/* Modals & lightboxes */}
            <ImageLightbox
                open={imageLightbox !== null}
                src={imageLightbox?.src ?? ""}
                alt={imageLightbox?.alt ?? ""}
                onClose={() => setImageLightbox(null)}
            />

            {product && (
                <EditProduct
                    open={editProductOpen}
                    product={product}
                    onClose={() => setEditProductOpen(false)}
                    onSuccess={() => {
                        setEditProductOpen(false);
                        handleProductUpdated();
                    }}
                />
            )}
        </Box>
    );
}
