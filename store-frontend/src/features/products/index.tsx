'use client';

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Grid from "@mui/material/Grid";
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    InputAdornment,
    Paper,
    Skeleton,
    Snackbar,
    TablePagination,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AddRoundedIcon        from "@mui/icons-material/AddRounded";
import SearchRoundedIcon     from "@mui/icons-material/SearchRounded";
import EditRoundedIcon       from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteRoundedIcon     from "@mui/icons-material/DeleteRounded";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import DataTable, { TableColumn } from "@/shared/components/DataTable";
import { ListLayoutMeasurePlaceholder } from "@/shared/components/ListLayoutMeasurePlaceholder";
import { useNarrowLayoutMd } from "@/shared/hooks/useNarrowLayoutMd";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS }      from "@/shared/config/permissions";
import { useProducts } from "./hooks/productsHooks";
import { Product }      from "./types/productsTypes";
import CreateProduct    from "./components/CreateProduct";
import EditProduct      from "./components/EditProduct";
import DeleteProduct    from "./components/DeleteProduct";

interface SnackbarState {
    open: boolean;
    message: string;
    severity: "success" | "error";
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(value);

/** Suma de stock solo de variantes activas (inventario disponible del producto). */
const totalStockAcrossVariants = (row: Product): number =>
    (row.variants ?? [])
        .filter((v) => v.isActive)
        .reduce((sum, v) => sum + (Number.isFinite(v.stock) ? v.stock : 0), 0);

const activeVariantCount = (row: Product): number =>
    row.variants.filter((v) => v.isActive).length;

function ProductMobileCard({
    product,
    mounted,
    canRead,
    canUpdate,
    canDelete,
    highlighted,
    onView,
    onEdit,
    onDelete,
}: {
    product: Product;
    mounted: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    highlighted: boolean;
    onView: (p: Product) => void;
    onEdit: (p: Product) => void;
    onDelete: (p: Product) => void;
}) {
    const theme = useTheme();
    const accent = theme.palette.primary.main;
    const stock = totalStockAcrossVariants(product);
    const variants = activeVariantCount(product);
    const stockColor = stock === 0 ? "error" : stock <= product.minStock ? "warning" : "success";
    const stockLabel = stock === 0 ? "SIN STOCK" : stock <= product.minStock ? `STOCK BAJO: ${stock}` : `DISPONIBLE: ${stock}`;

    const metricChipSx = {
        height: 26,
        borderRadius: 2,
        fontWeight: 700,
        fontSize: "0.65rem",
        letterSpacing: 0.3,
        bgcolor: (t: Theme) =>
            t.palette.mode === "dark"
                ? t.palette.background.tableHeader
                : alpha(t.palette.grey[200], 1),
        color: (t: Theme) =>
            t.palette.mode === "dark"
                ? "#ECE8DD"
                : t.palette.text.primary,
        boxShadow: "none",
        "& .MuiChip-label": { px: 1.25, py: 0 },
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                height: "100%",
                bgcolor: (t) =>
                    highlighted
                        ? alpha(t.palette.warning.main, t.palette.mode === "dark" ? 0.14 : 0.1)
                        : t.palette.mode === "dark"
                          ? alpha(t.palette.background.paper, 0.55)
                          : t.palette.background.paper,
                borderColor: (t) => (highlighted ? alpha(t.palette.warning.main, 0.55) : alpha(t.palette.divider, 0.2)),
                borderLeft: highlighted ? "3px solid" : undefined,
                borderLeftColor: highlighted ? "warning.main" : undefined,
            }}
        >
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ flex: 1, minWidth: 0, pt: 0.25, pr: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {product.name}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.35, wordBreak: "break-word", fontSize: "0.8rem" }}
                    >
                        {product.categoryName}
                    </Typography>
                </Box>
                {mounted && (
                    <Box sx={{ display: "flex", flexShrink: 0, gap: 0.25, mt: -0.25 }}>
                        {canRead && (
                            <Tooltip title="Ver detalle">
                                <IconButton
                                    size="small"
                                    onClick={() => onView(product)}
                                    aria-label="Ver producto"
                                    sx={{ color: alpha(accent, 0.95) }}
                                >
                                    <VisibilityRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canUpdate && (
                            <Tooltip title="Editar">
                                <IconButton
                                    size="small"
                                    onClick={() => onEdit(product)}
                                    aria-label="Editar producto"
                                    sx={{ color: alpha(accent, 0.95) }}
                                >
                                    <EditRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip title="Eliminar">
                                <IconButton
                                    size="small"
                                    onClick={() => onDelete(product)}
                                    aria-label="Eliminar producto"
                                    sx={{ color: "error.main" }}
                                >
                                    <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 0.75,
                    mt: 2,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Chip
                    label={stockLabel}
                    size="small"
                    color={stockColor}
                    sx={{
                        height: 26,
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        letterSpacing: 0.3,
                        boxShadow: "none",
                        "& .MuiChip-label": { px: 1.25, py: 0 },
                    }}
                />
                <Chip
                    label={`VARIANTES: ${variants}`}
                    size="small"
                    variant="outlined"
                    sx={{
                        height: 26,
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        letterSpacing: 0.3,
                        boxShadow: "none",
                        borderColor: "divider",
                        color: "text.secondary",
                        "& .MuiChip-label": { px: 1.25, py: 0 },
                    }}
                />
            </Box>
        </Paper>
    );
}

export default function Products() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") ?? "";

    const [page, setPage]               = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

    // Highlight row that matches the initial search from notification link
    const highlightRef = useRef<string>(initialSearch);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [createOpen, setCreateOpen]           = useState(false);
    const [editOpen, setEditOpen]               = useState(false);
    const [viewOpen, setViewOpen]               = useState(false);
    const [deleteOpen, setDeleteOpen]           = useState(false);
    const [snackbar, setSnackbar]               = useState<SnackbarState>({ open: false, message: "", severity: "success" });

    const canRead   = useHasPermission(PERMISSIONS.PRODUCTS.READ);
    const canCreate = useHasPermission(PERMISSIONS.PRODUCTS.CREATE);
    const canUpdate = useHasPermission(PERMISSIONS.PRODUCTS.UPDATE);
    const canDelete = useHasPermission(PERMISSIONS.PRODUCTS.DELETE);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const theme = useTheme();
    const { ready: layoutReady, isNarrow: isNarrowLayout } = useNarrowLayoutMd();
    const isShortLabel = useMediaQuery(theme.breakpoints.down("sm"));
    const isIconOnlyCreate = useMediaQuery(theme.breakpoints.down("sm"));

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchInput); setPage(0); }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data, loading, refetch } = useProducts({
        limit:  rowsPerPage,
        offset: page * rowsPerPage,
        search: debouncedSearch || undefined,
    });

    const showSnackbar = (message: string, severity: "success" | "error" = "success") =>
        setSnackbar({ open: true, message, severity });

    /** Quita foco del IconButton de la tabla antes de abrir el modal (evita aria-hidden + foco en el fondo). */
    const blurActiveElement = () => {
        (document.activeElement as HTMLElement)?.blur();
    };

    const handleEdit = (product: Product) => {
        blurActiveElement();
        setSelectedProduct(product);
        setEditOpen(true);
    };
    const handleView = (product: Product) => {
        router.push(`/products/${product.id}`);
    };
    const handleDelete = (product: Product) => {
        blurActiveElement();
        setSelectedProduct(product);
        setDeleteOpen(true);
    };

    const columns: TableColumn<Product>[] = [
        {
            key: "index", label: "#", width: 55,
            render: (_, i) => page * rowsPerPage + i + 1,
        },
        { key: "name",         label: "Nombre",    width: 220 },
        { key: "categoryName", label: "Categoría", width: 140 },
        {
            key: "variantsCount",
            label: "Variantes",
            width: 100,
            align: "center",
            render: (row) => (
                <Chip
                    label={activeVariantCount(row)}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: "divider", color: "text.secondary", fontWeight: 700 }}
                />
            ),
        },
        {
            key: "totalStock",
            label: "Disponible",
            width: 120,
            align: "right",
            render: (row) => {
                const stock = totalStockAcrossVariants(row);
                let stockColor: "success" | "warning" | "error" = "success";
                let stockLabel = `${stock}`;
                
                if (stock === 0) {
                    stockColor = "error";
                    stockLabel = "Sin stock";
                } else if (stock <= row.minStock) {
                    stockColor = "warning";
                    stockLabel = `${stock} bajo`;
                } else {
                    stockColor = "success";
                    stockLabel = `${stock}`;
                }

                return (
                    <Chip
                        label={stockLabel}
                        size="small"
                        color={stockColor}
                        sx={{ fontWeight: 750 }}
                    />
                );
            },
        },
        {
            key: "actions",
            label: "Acciones",
            width: 130,
            align: "center",
            render: (row) => (
                mounted ? (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {canRead && (
                            <Tooltip title="Ver detalle">
                                <IconButton size="small" onClick={() => handleView(row)}>
                                    <VisibilityRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canUpdate && (
                            <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleEdit(row)}>
                                    <EditRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {canDelete && (
                            <Tooltip title="Eliminar">
                                <IconButton size="small" onClick={() => handleDelete(row)} sx={{ color: "error.main" }}>
                                    <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                ) : null
            ),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Gestión de productos
            </Typography>

            <Box
                sx={{
                    display: "flex",
                    gap: 1.5,
                    mb: 3,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "nowrap",
                }}
            >
                <TextField
                    placeholder="Buscar producto..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 400 } }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                {mounted && canCreate && (
                    <Button
                        variant="contained"
                        startIcon={isIconOnlyCreate ? undefined : <AddRoundedIcon />}
                        onClick={() => {
                            blurActiveElement();
                            setCreateOpen(true);
                        }}
                        aria-label="Crear producto"
                        sx={{
                            flexShrink: 0,
                            minWidth: isIconOnlyCreate ? 44 : undefined,
                            px: isIconOnlyCreate ? 1 : undefined,
                        }}
                    >
                        {isIconOnlyCreate ? <AddRoundedIcon /> : "Crear producto"}
                    </Button>
                )}
            </Box>

            {!layoutReady ? (
                <ListLayoutMeasurePlaceholder />
            ) : isNarrowLayout ? (
                <Paper
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        maxWidth: "100%",
                    }}
                >
                    <Grid
                        container
                        spacing={1.5}
                        sx={{ p: 2, maxWidth: "100%", boxSizing: "border-box", width: "100%" }}
                    >
                        {loading ? (
                            Array.from({ length: rowsPerPage }).map((_, i) => (
                                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                                    <Skeleton variant="rounded" height={210} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))
                        ) : (data?.results ?? []).length === 0 ? (
                            <Grid size={12}>
                                <Box sx={{ py: 6, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No se encontraron productos.
                                    </Typography>
                                </Box>
                            </Grid>
                        ) : (
                            (data?.results ?? []).map((row) => {
                                const q = highlightRef.current;
                                const highlighted =
                                    Boolean(q) && row.name.toLowerCase().includes(q.toLowerCase());
                                return (
                                    <Grid key={row.id} size={{ xs: 12, sm: 6 }}>
                                        <ProductMobileCard
                                            product={row}
                                            mounted={mounted}
                                            canRead={canRead}
                                            canUpdate={canUpdate}
                                            canDelete={canDelete}
                                            highlighted={highlighted}
                                            onView={handleView}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    </Grid>
                                );
                            })
                        )}
                    </Grid>
                    <TablePagination
                        component="div"
                        count={data?.count ?? 0}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={isShortLabel ? "Filas" : "Filas:"}
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
                        }
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            ) : (
                <DataTable<Product>
                    columns={columns}
                    rows={data?.results ?? []}
                    loading={loading}
                    total={data?.count ?? 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
                    getRowKey={(row) => row.id}
                    getRowSx={(row) =>
                        highlightRef.current &&
                        row.name.toLowerCase().includes(highlightRef.current.toLowerCase())
                            ? {
                                bgcolor: (th: Theme) => alpha(th.palette.warning.main, 0.12),
                                "& td:first-of-type": {
                                    borderLeft: "3px solid",
                                    borderColor: "warning.main",
                                },
                              }
                            : undefined
                    }
                    emptyMessage="No se encontraron productos."
                />
            )}

            <CreateProduct
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Producto creado exitosamente."); }}
            />

            <EditProduct
                open={editOpen}
                product={selectedProduct}
                onClose={() => setEditOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Producto actualizado exitosamente."); }}
            />

            {/* ViewProduct dialog has been replaced by dynamic route /products/[id] */}

            <DeleteProduct
                open={deleteOpen}
                product={selectedProduct}
                onClose={() => setDeleteOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Producto eliminado exitosamente."); }}
            />

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
