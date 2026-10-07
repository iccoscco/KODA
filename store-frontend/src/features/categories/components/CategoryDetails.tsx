'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
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
    Snackbar,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import InventoryRoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import WidgetsRoundedIcon from "@mui/icons-material/WidgetsRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";

import { CategoryService } from "../services/categories.service";
import { useGetCategoryById } from "../hooks/categoriesHooks";
import { Product } from "@/features/products/types/productsTypes";
import { formatDateTime as fmtDateTime } from "@/shared/utils/dateFormat";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import { ImageLightbox, VariantImageThumb } from "@/features/products/components/variantImageUi";
import EditProduct from "@/features/products/components/EditProduct";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS }      from "@/shared/config/permissions";

interface Props {
    id: number;
}

const currency = (value: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(value);

export default function CategoryDetails({ id }: Props) {
    const router = useRouter();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const { data: category, loading: categoryLoading, error: categoryError, refetch: refetchCategory } = useGetCategoryById(id, !!id);
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);

    const [editProductOpen, setEditProductOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success"
    });

    const canUpdate = useHasPermission(PERMISSIONS.PRODUCTS.UPDATE);

    const fetchProducts = useCallback(() => {
        if (!id) return;
        setProductsLoading(true);
        setProductsError(null);
        CategoryService.getCategoryProducts(id)
            .then(setProducts)
            .catch((err) => {
                console.error("[CategoryDetails - fetchProducts]", err);
                setProductsError("No se pudieron cargar los productos de la categoría.");
            })
            .finally(() => setProductsLoading(false));
    }, [id]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const activeProducts = useMemo(
        () => products.filter((p) => p.isActive),
        [products]
    );

    const handleBack = () => {
        router.push("/categories");
    };

    const handleEditProduct = (product: Product) => {
        (document.activeElement as HTMLElement)?.blur();
        setSelectedProduct(product);
        setEditProductOpen(true);
    };

    if (categoryLoading) {
        return (
            <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" width="40%" height={32} />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (categoryError || !category) {
        return (
            <Box sx={{ p: 3 }}>
                <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={handleBack}
                    sx={{ mb: 3 }}
                >
                    Volver a categorías
                </Button>
                <Alert severity="error">
                    {categoryError || "No se encontró la categoría seleccionada."}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, pb: 6 }}>
            {/* Header Navigation */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <IconButton onClick={handleBack} aria-label="Volver">
                    <ArrowBackRoundedIcon />
                </IconButton>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                        Detalle de Categoría: {category.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitoreo general de productos y variantes asociadas
                    </Typography>
                </Box>
            </Box>

            {/* General Metrics & Info Grid */}
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
                            Información de la Categoría
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Nombre de la Categoría
                                </Typography>
                                <Typography variant="body1" fontWeight={600} gutterBottom>
                                    {category.name}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Estado
                                </Typography>
                                <Chip
                                    label={category.isActive ? "Activo" : "Inactivo"}
                                    size="small"
                                    color={category.isActive ? "success" : "error"}
                                    variant="outlined"
                                    icon={category.isActive ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
                                    sx={{ mt: 0.5, fontWeight: 600 }}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Descripción
                                </Typography>
                                <Typography variant="body2" color="text.primary" sx={{ whiteSpace: "pre-wrap" }}>
                                    {category.description || "Sin descripción proporcionada."}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Fecha de Creación
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {fmtDateTime(category.createdAt)}
                                </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Última Actualización
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {fmtDateTime(category.updatedAt)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* Metrics Grid */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Grid container spacing={2} sx={{ height: "100%" }}>
                        {/* Metric 1: Products */}
                        <Grid size={{ xs: 6, sm: 4, md: 12 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    borderColor: (t) => alpha(t.palette.divider, 0.2),
                                }}
                            >
                                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, "&:last-child": { pb: 2 } }}>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2.5,
                                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                                            color: "primary.main",
                                            display: "flex",
                                        }}
                                    >
                                        <WidgetsRoundedIcon />
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight={800} color="text.primary">
                                            {category.productCount ?? 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                            Productos Totales
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Metric 2: Variants */}
                        <Grid size={{ xs: 6, sm: 4, md: 12 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    borderColor: (t) => alpha(t.palette.divider, 0.2),
                                }}
                            >
                                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, "&:last-child": { pb: 2 } }}>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2.5,
                                            bgcolor: (t) => alpha(t.palette.secondary.main, 0.1),
                                            color: "secondary.main",
                                            display: "flex",
                                        }}
                                    >
                                        <LayersRoundedIcon />
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight={800} color="text.primary">
                                            {category.variantCount ?? 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                            Variantes Totales
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Metric 3: Total Stock */}
                        <Grid size={{ xs: 12, sm: 4, md: 12 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    borderColor: (t) => alpha(t.palette.divider, 0.2),
                                }}
                            >
                                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, "&:last-child": { pb: 2 } }}>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2.5,
                                            bgcolor: (t) => alpha(t.palette.success.main, 0.1),
                                            color: "success.main",
                                            display: "flex",
                                        }}
                                    >
                                        <InventoryRoundedIcon />
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight={800} color="text.primary">
                                            {category.totalStock ?? 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                            Unidades en Inventario
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Divider />

            {/* Products & Variants List */}
            <Box>
                <Typography variant="h6" fontWeight={750} sx={{ mb: 3 }}>
                    Productos y Variantes Activas ({activeProducts.length})
                </Typography>

                {productsLoading ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
                    </Box>
                ) : productsError ? (
                    <Alert severity="error">{productsError}</Alert>
                ) : activeProducts.length === 0 ? (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 5,
                            textAlign: "center",
                            borderRadius: 3,
                            borderColor: (t) => alpha(t.palette.divider, 0.15),
                            bgcolor: (t) => alpha(t.palette.action.hover, 0.2),
                        }}
                    >
                        <InventoryRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
                        <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
                            Sin productos activos
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto" }}>
                            Esta categoría no tiene productos registrados actualmente o se encuentran inactivos.
                        </Typography>
                    </Paper>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {activeProducts.map((product) => {
                            const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
                            return (
                                <Paper
                                    key={product.id}
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 3,
                                        overflow: "hidden",
                                        borderColor: (t) => alpha(t.palette.divider, 0.2),
                                        transition: "box-shadow 0.2s, border-color 0.2s",
                                        "&:hover": {
                                            boxShadow: (t) => t.shadows[1],
                                            borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                                        },
                                    }}
                                >
                                    {/* Product Top Header */}
                                    <Box
                                        sx={{
                                            p: { xs: 2, sm: 3 },
                                            bgcolor: (t) =>
                                                t.palette.mode === "dark"
                                                    ? alpha(t.palette.background.paper, 0.4)
                                                    : alpha(t.palette.action.hover, 0.15),
                                            borderBottom: "1px solid",
                                            borderColor: "divider",
                                            display: "flex",
                                            flexDirection: { xs: "column", sm: "row" },
                                            justifyContent: "space-between",
                                            alignItems: { xs: "flex-start", sm: "center" },
                                            gap: 2,
                                        }}
                                    >
                                        <Box>
                                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                                <Typography variant="subtitle1" fontWeight={750} sx={{ fontSize: "1.1rem" }}>
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
                                                            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                                <Chip
                                                    label={`Min. Stock: ${product.minStock}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 500 }}
                                                />
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                ID: #{product.id} • Creado el {fmtDateTime(product.createdAt)}
                                            </Typography>
                                        </Box>

                                        {/* Product Price & General Stock Metrics & Actions */}
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={3.5}
                                            alignItems={{ xs: "stretch", sm: "center" }}
                                            sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
                                        >
                                            <Stack direction="row" spacing={3} sx={{ justifyContent: { xs: "space-between", sm: "flex-end" } }}>
                                                <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Precio Compra
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                                        {currency(product.purchasePrice)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Precio Venta
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="primary.main">
                                                        {currency(product.salePrice)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: "right" }}>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Total Vendidos
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} color="text.primary">
                                                        {product.totalSold ?? 0} uds.
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            {canUpdate && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<EditRoundedIcon />}
                                                    onClick={() => handleEditProduct(product)}
                                                    sx={{
                                                        borderRadius: 2.5,
                                                        textTransform: "none",
                                                        fontWeight: 750,
                                                        px: 2,
                                                        py: 0.75,
                                                        boxShadow: "none",
                                                        alignSelf: { xs: "stretch", sm: "center" },
                                                        bgcolor: "primary.main",
                                                        whiteSpace: "nowrap",
                                                        flexShrink: 0,
                                                        minWidth: "fit-content",
                                                        "&:hover": {
                                                            bgcolor: "primary.dark",
                                                            boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.2)}`,
                                                        }
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Product Variants Sub-list */}
                                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
                                            Variantes Activas ({activeVariants.length})
                                        </Typography>

                                        {activeVariants.length === 0 ? (
                                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                                Este producto no tiene variantes registradas o activas actualmente.
                                            </Alert>
                                        ) : (
                                            <Grid container spacing={2}>
                                                {activeVariants.map((variant) => {
                                                    // Pricing details: custom overrides or inherited
                                                    const finalSale = variant.salePrice ?? product.salePrice;
                                                    const finalPurchase = variant.purchasePrice ?? product.purchasePrice;
                                                    const hasPriceOverride = variant.salePrice != null || variant.purchasePrice != null;

                                                    // Stock level color indicator
                                                    let stockColor = "success";
                                                    let stockTooltip = "Stock adecuado";
                                                    if (variant.stock <= 0) {
                                                        stockColor = "error";
                                                        stockTooltip = "Sin Stock (Agotado)";
                                                    } else if (variant.stock <= variant.minStock) {
                                                        stockColor = "error";
                                                        stockTooltip = `Bajo stock (Mínimo: ${variant.minStock})`;
                                                    } else if (variant.stock <= variant.minStock + 5) {
                                                        stockColor = "warning";
                                                        stockTooltip = "Stock próximo al mínimo";
                                                    }

                                                    return (
                                                        <Grid key={variant.id} size={12}>
                                                            <Box
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
                                                                {/* SKU, Color, Size */}
                                                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ flex: 1 }}>
                                                                    {/* Color Swatch & Details */}
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

                                                                    {/* Stock level chip */}
                                                                    <Tooltip title={stockTooltip}>
                                                                        <Chip
                                                                            label={`Stock: ${variant.stock}`}
                                                                            size="small"
                                                                            color={stockColor as "success" | "warning" | "error"}
                                                                            variant="outlined"
                                                                            sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                                                                        />
                                                                    </Tooltip>

                                                                    {/* Override Price Badge */}
                                                                    {hasPriceOverride && (
                                                                        <Tooltip title="Esta variante tiene precios personalizados en lugar de heredar los del producto base.">
                                                                            <Chip
                                                                                label="Precios específicos"
                                                                                size="small"
                                                                                color="info"
                                                                                variant="outlined"
                                                                                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                                                            />
                                                                        </Tooltip>
                                                                    )}
                                                                </Stack>

                                                                {/* Custom or Inherited Pricing Displays & Variant Images */}
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
                                                                    {/* Prices Row */}
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
                                                                                    Precio Compra
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

                                                                    {/* Variant Images Thumbnails */}
                                                                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: { xs: 0.5, sm: 0 }, alignSelf: { xs: "flex-start", sm: "auto" } }}>
                                                                        {(variant.images ?? []).length === 0 ? (
                                                                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                                                                                Sin fotos
                                                                            </Typography>
                                                                        ) : (
                                                                            (variant.images ?? []).slice(0, 3).map((img) => {
                                                                                const src = toMediaUrl(img.url);
                                                                                const alt = `Variante SKU: ${variant.sku ?? variant.id} — imagen`;
                                                                                return (
                                                                                    <VariantImageThumb
                                                                                        key={img.id}
                                                                                        src={src}
                                                                                        alt={alt}
                                                                                        size={40}
                                                                                        isMain={img.isMain}
                                                                                        emphasized={img.isMain}
                                                                                        onExpand={() => setImageLightbox({ src, alt })}
                                                                                    />
                                                                                );
                                                                            })
                                                                        )}
                                                                    </Box>
                                                                </Stack>
                                                            </Box>
                                                        </Grid>
                                                    );
                                                })}
                                            </Grid>
                                        )}
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Lightbox Modal for variant images enlargement */}
            <ImageLightbox
                open={imageLightbox !== null}
                src={imageLightbox?.src ?? ""}
                alt={imageLightbox?.alt ?? ""}
                onClose={() => setImageLightbox(null)}
            />

            {/* Edit Product Modal */}
            <EditProduct
                open={editProductOpen}
                product={selectedProduct}
                onClose={() => setEditProductOpen(false)}
                onSuccess={() => {
                    fetchProducts();
                    refetchCategory();
                    setSnackbar({
                        open: true,
                        message: "Producto actualizado exitosamente.",
                        severity: "success"
                    });
                }}
            />

            {/* Success Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
