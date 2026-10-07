'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Grid from "@mui/material/Grid";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import DataTable, { TableColumn } from "@/shared/components/DataTable";
import { ListLayoutMeasurePlaceholder } from "@/shared/components/ListLayoutMeasurePlaceholder";
import { useNarrowLayoutMd } from "@/shared/hooks/useNarrowLayoutMd";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";
import { useCategories } from "./hooks/categoriesHooks";
import { Category } from "./types/categoriesTypes";
import CreateCategories from "./components/CreateCategories";
import EditCategories from "./components/EditCategories";
import ViewCategory from "./components/ViewCategory";
import DeleteCategories from "./components/DeleteCategories";

interface SnackbarState {
    open: boolean;
    message: string;
    severity: "success" | "error";
}

function CategoryMobileCard({
    category,
    mounted,
    canRead,
    canUpdate,
    canDelete,
    onView,
    onEdit,
    onDelete,
}: {
    category: Category;
    mounted: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    onView: (c: Category) => void;
    onEdit: (c: Category) => void;
    onDelete: (c: Category) => void;
}) {
    const theme = useTheme();
    const accent = theme.palette.primary.main;
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
                    t.palette.mode === "dark" ? alpha(t.palette.background.paper, 0.55) : t.palette.background.paper,
                borderColor: (t) => alpha(t.palette.divider, 0.2),
            }}
        >
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ flex: 1, minWidth: 0, pt: 0.25, pr: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {category.name}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.35, wordBreak: "break-word", fontSize: "0.8rem" }}
                    >
                        {category.description || "—"}
                    </Typography>
                </Box>
                {mounted && (
                    <Box sx={{ display: "flex", flexShrink: 0, gap: 0.25, mt: -0.25 }}>
                        {canRead && (
                            <Tooltip title="Ver detalle">
                                <IconButton
                                    size="small"
                                    onClick={() => onView(category)}
                                    aria-label="Ver categoría"
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
                                    onClick={() => onEdit(category)}
                                    aria-label="Editar categoría"
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
                                    onClick={() => onDelete(category)}
                                    aria-label="Eliminar categoría"
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
                    label={`PRODUCTOS: ${category.productCount ?? 0}`}
                    size="small"
                    variant="filled"
                    sx={metricChipSx}
                />
                <Chip
                    label={`VARIANTES: ${category.variantCount ?? 0}`}
                    size="small"
                    variant="filled"
                    sx={metricChipSx}
                />
                <Chip
                    label={`STOCK: ${category.totalStock ?? 0}`}
                    size="small"
                    variant="filled"
                    sx={metricChipSx}
                />
            </Box>
        </Paper>
    );
}

export default function Categories() {
    const router = useRouter();
    const [page, setPage]               = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [createOpen, setCreateOpen]             = useState(false);
    const [editOpen, setEditOpen]                 = useState(false);
    const [deleteOpen, setDeleteOpen]             = useState(false);
    const [viewOpen, setViewOpen]                 = useState(false);
    const [viewCategoryId, setViewCategoryId]     = useState<number | null>(null);
    const [snackbar, setSnackbar]                 = useState<SnackbarState>({ open: false, message: "", severity: "success" });

    const canRead   = useHasPermission(PERMISSIONS.CATEGORIES.READ);
    const canCreate = useHasPermission(PERMISSIONS.CATEGORIES.CREATE);
    const canUpdate = useHasPermission(PERMISSIONS.CATEGORIES.UPDATE);
    const canDelete = useHasPermission(PERMISSIONS.CATEGORIES.DELETE);
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

    const { data, loading, refetch } = useCategories({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: debouncedSearch || undefined,
    });

    const showSnackbar = (message: string, severity: "success" | "error" = "success") =>
        setSnackbar({ open: true, message, severity });

    const handleEdit   = (category: Category) => { setSelectedCategory(category); setEditOpen(true); };
    const handleDelete = (category: Category) => { setSelectedCategory(category); setDeleteOpen(true); };
    const handleView   = (category: Category) => { router.push(`/categories/${category.id}`); };

    const columns: TableColumn<Category>[] = [
        {
            key: "index", label: "#", width: 60,
            render: (_, i) => page * rowsPerPage + i + 1,
        },
        { key: "name",        label: "Nombre",      width: 200 },
        { key: "description", label: "Descripción" },
        {
            key: "productCount",
            label: "Productos",
            width: 110,
            align: "center",
            render: (row) => row.productCount ?? 0,
        },
        {
            key: "variantCount",
            label: "Variantes",
            width: 110,
            align: "center",
            render: (row) => row.variantCount ?? 0,
        },
        {
            key: "totalStock",
            label: "Stock total",
            width: 120,
            align: "center",
            render: (row) => row.totalStock ?? 0,
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
                Gestión de categorías
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
                    placeholder="Buscar categoría..."
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
                        onClick={() => setCreateOpen(true)}
                        aria-label="Crear categoría"
                        sx={{
                            flexShrink: 0,
                            minWidth: isIconOnlyCreate ? 44 : undefined,
                            px: isIconOnlyCreate ? 1 : undefined,
                        }}
                    >
                        {isIconOnlyCreate ? <AddRoundedIcon /> : "Crear categoría"}
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
                                    <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))
                        ) : (data?.results ?? []).length === 0 ? (
                            <Grid size={12}>
                                <Box sx={{ py: 6, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No se encontraron categorías.
                                    </Typography>
                                </Box>
                            </Grid>
                        ) : (
                            (data?.results ?? []).map((row) => (
                                <Grid key={row.id} size={{ xs: 12, sm: 6 }}>
                                    <CategoryMobileCard
                                        category={row}
                                        mounted={mounted}
                                        canRead={canRead}
                                        canUpdate={canUpdate}
                                        canDelete={canDelete}
                                        onView={handleView}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                </Grid>
                            ))
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
                <DataTable<Category>
                    columns={columns}
                    rows={data?.results ?? []}
                    loading={loading}
                    total={data?.count ?? 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
                    getRowKey={(row) => row.id}
                    emptyMessage="No se encontraron categorías."
                />
            )}

            <CreateCategories
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Categoría creada exitosamente."); }}
            />
            <EditCategories
                open={editOpen}
                category={selectedCategory}
                onClose={() => setEditOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Categoría actualizada exitosamente."); }}
            />
            <DeleteCategories
                open={deleteOpen}
                category={selectedCategory}
                onClose={() => setDeleteOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Categoría eliminada exitosamente."); }}
            />
            <ViewCategory
                open={viewOpen}
                categoryId={viewCategoryId}
                onClose={() => {
                    setViewOpen(false);
                    setViewCategoryId(null);
                }}
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
