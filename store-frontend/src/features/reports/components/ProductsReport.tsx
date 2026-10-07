"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Alert, Autocomplete, Box, Button, Chip, CircularProgress,
    FormControl, InputLabel, MenuItem, Paper, Select, Stack,
    TablePagination, TextField, Tooltip, Typography,
} from "@mui/material";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { CategoryService } from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/categoriesTypes";
import DataTable, { type TableColumn } from "@/shared/components/DataTable";
import InlineLoading from "@/shared/components/InlineLoading";
import { ListLayoutMeasurePlaceholder } from "@/shared/components/ListLayoutMeasurePlaceholder";
import { useNarrowLayoutMd } from "@/shared/hooks/useNarrowLayoutMd";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import { ReportsService } from "../services/reports.service";
import type { ProductReportRow, ProductFilters } from "../types/reportsTypes";

const currency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

/**
 * Muestra el precio de venta del producto considerando overrides de variantes:
 *  - Si min != max → rango compacto "S/ 50.00 – 70.00".
 *  - Si todas las variantes comparten precio (o no hay) → valor único.
 */
const formatProductPrice = (row: ProductReportRow): string => {
    const min = row.minVariantPrice;
    const max = row.maxVariantPrice;
    if (min != null && max != null && min !== max) {
        return `${currency(min)} – ${max.toFixed(2)}`;
    }
    return currency(min ?? max ?? row.salePrice);
};

const columns: TableColumn<ProductReportRow>[] = [
    { key: "name",         label: "Producto" },
    { key: "categoryName", label: "Categoría" },
    {
        key: "salePrice",
        label: "P.Venta",
        align: "right",
        render: (row) => formatProductPrice(row),
    },
    { key: "variantCount", label: "Variantes", align: "right" },
    {
        key: "totalStock",
        label: "Stock",
        align: "right",
        render: (row) => (
            <Typography
                variant="body2"
                color={row.totalStock === 0 ? "error" : "text.primary"}
                fontWeight={row.totalStock === 0 ? 600 : undefined}
            >
                {row.totalStock}
            </Typography>
        ),
    },
    {
        key: "isActive",
        label: "Estado",
        align: "center",
        render: (row) => (
            <Chip
                size="small"
                label={row.isActive ? "Activo" : "Inactivo"}
                color={row.isActive ? "success" : "default"}
            />
        ),
    },
];

function ProductMobileCard({ row }: { row: ProductReportRow }) {
    return (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, lineHeight: 1.3 }}>
                {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.25 }}>
                {row.categoryName}
            </Typography>
            <Stack spacing={0.75}>
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 1.5, alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Precio venta</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
                        {formatProductPrice(row)}
                    </Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 1.5, alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Variantes</Typography>
                    <Typography variant="body2" fontWeight={600}>{row.variantCount}</Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 1.5, alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">Stock</Typography>
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.totalStock === 0 ? "error" : "text.primary"}
                    >
                        {row.totalStock}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Estado</Typography>
                    <Chip
                        size="small"
                        label={row.isActive ? "Activo" : "Inactivo"}
                        color={row.isActive ? "success" : "default"}
                    />
                </Box>
            </Stack>
        </Paper>
    );
}

export default function ProductsReport() {
    const { ready: layoutReady, isNarrow: isNarrowLayout } = useNarrowLayoutMd();

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts]     = useState<ProductReportRow[]>([]);
    const [total, setTotal]           = useState(0);
    /** `true` al montar evita un frame de “vacío” antes del primer fetch. */
    const [loading, setLoading]       = useState(true);
    const [exporting, setExporting]   = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [page, setPage]             = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filters, setFilters] = useState<ProductFilters>({
        categoryId: "",
        status: "",
        stockFilter: "",
    });

    useEffect(() => {
        CategoryService.getAllCategories().then(setCategories).catch(() => {});
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await ReportsService.getProducts(filters, {
                limit: rowsPerPage,
                offset: page * rowsPerPage,
            });
            setProducts(data.results);
            setTotal(data.count);
        } catch {
            setError("Error al cargar el reporte de productos");
        } finally {
            setLoading(false);
        }
    }, [filters, page, rowsPerPage]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFilterChange = (patch: Partial<ProductFilters>) => {
        setPage(0);
        setFilters((f) => ({ ...f, ...patch }));
    };

    const handleExport = async () => {
        setExporting(true);
        try { await ReportsService.exportProductsPdf(filters); }
        catch { setError("Error al exportar el PDF"); }
        finally { setExporting(false); }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            <Stack spacing={1.5}>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        flexWrap: "wrap",
                        gap: 1.5,
                        alignItems: { xs: "stretch", sm: "center" },
                    }}
                >
                    <Autocomplete
                        size="small"
                        sx={{ width: { xs: "100%", sm: 220 } }}
                        options={categories}
                        getOptionLabel={(c) => c.name}
                        value={categories.find((c) => c.id === filters.categoryId) ?? null}
                        onChange={(_, value) => handleFilterChange({ categoryId: value ? value.id : "" })}
                        renderInput={(params) => <TextField {...params} label="Categoría" />}
                        noOptionsText="Sin categorías"
                    />

                    <FormControl size="small" sx={{ minWidth: { sm: 130 }, width: { xs: "100%", sm: "auto" } }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            label="Estado"
                            value={filters.status ?? ""}
                            onChange={(e) => handleFilterChange({ status: e.target.value })}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="ACTIVE">Activos</MenuItem>
                            <MenuItem value="INACTIVE">Inactivos</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: { sm: 140 }, width: { xs: "100%", sm: "auto" } }}>
                        <InputLabel>Stock</InputLabel>
                        <Select
                            label="Stock"
                            value={filters.stockFilter ?? ""}
                            onChange={(e) => handleFilterChange({ stockFilter: e.target.value })}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="WITH_STOCK">Con stock</MenuItem>
                            <MenuItem value="WITHOUT_STOCK">Sin stock</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
                    <Tooltip title="Exportar PDF">
                        <span style={{ display: "block", width: "100%" }}>
                            <Button
                                variant="contained"
                                color="error"
                                fullWidth
                                sx={{ maxWidth: { sm: 220 } }}
                                startIcon={exporting
                                    ? <CircularProgress size={16} color="inherit" />
                                    : <PictureAsPdfRoundedIcon />}
                                onClick={handleExport}
                                disabled={exporting || total === 0}
                            >
                                Exportar PDF
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            {!layoutReady ? (
                <ListLayoutMeasurePlaceholder />
            ) : isNarrowLayout ? (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    {loading ? (
                        <InlineLoading />
                    ) : products.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 6, textAlign: "center", px: 2 }}>
                            No hay productos con los filtros aplicados.
                        </Typography>
                    ) : (
                        <Stack spacing={1.25} sx={{ p: 1.5 }}>
                            {products.map((row) => (
                                <ProductMobileCard key={row.id} row={row} />
                            ))}
                        </Stack>
                    )}
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(_, p) => setPage(p)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="Filas"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            ) : (
                <DataTable
                    columns={columns}
                    rows={products}
                    total={total}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
                    getRowKey={(row) => row.id}
                    loading={loading}
                    loadingVariant="message"
                    emptyMessage="No hay productos con los filtros aplicados."
                    tablePaginationSx={compactTablePaginationSx}
                />
            )}
        </Box>
    );
}
