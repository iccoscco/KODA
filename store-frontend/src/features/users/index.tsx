'use client';

import { useState, useEffect } from "react";
import {
    Alert,
    Avatar,
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
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import Grid from "@mui/material/Grid";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import DataTable, { TableColumn } from "@/shared/components/DataTable";
import { ListLayoutMeasurePlaceholder } from "@/shared/components/ListLayoutMeasurePlaceholder";
import { useNarrowLayoutMd } from "@/shared/hooks/useNarrowLayoutMd";
import { useHasPermission } from "@/shared/hooks/usePermission";
import { PERMISSIONS } from "@/shared/config/permissions";
import { useAuthStore } from "@/store/auth.store";
import { useUsers } from "./hooks/usersHooks";
import { User } from "./types/usersTypes";
import CreateUser from "./components/CreateUser";
import EditUser from "./components/EditUser";
import DeleteUser from "./components/DeleteUser";
import { toMediaUrl } from "@/shared/utils/mediaUrl";

function UserMobileCard({
    user,
    mounted,
    canUpdate,
    canDelete,
    isSelf,
    onEdit,
    onDelete,
}: {
    user: User;
    mounted: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    isSelf: boolean;
    onEdit: (u: User) => void;
    onDelete: (u: User) => void;
}) {
    const theme = useTheme();
    const src = toMediaUrl(user.avatarUrl) || undefined;
    const initials = user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const accent = theme.palette.primary.main;
    const chipHeight = 28;
    const chipRadius = 2;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (t) =>
                    t.palette.mode === "dark" ? alpha(t.palette.background.paper, 0.55) : t.palette.background.paper,
                borderColor: (t) => alpha(t.palette.divider, 0.2),
            }}
        >
            <Box sx={{ display: "flex", gap: 1.75, alignItems: "flex-start" }}>
                <Avatar
                    src={src}
                    sx={{
                        width: 48,
                        height: 48,
                        fontSize: 15,
                        bgcolor: "primary.main",
                        flexShrink: 0,
                        border: "2px solid",
                        borderColor: alpha(accent, 0.55),
                    }}
                >
                    {!src && initials}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                        {user.name}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.35, wordBreak: "break-word", fontSize: "0.8rem" }}
                    >
                        {user.email}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, mt: -0.5, mr: -0.75, flexShrink: 0 }}>
                    {mounted && canUpdate && (
                        <Tooltip title="Editar">
                            <IconButton
                                size="small"
                                onClick={() => onEdit(user)}
                                aria-label="Editar usuario"
                                sx={{ color: alpha(accent, 0.95) }}
                            >
                                <EditRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {mounted && canDelete && !isSelf && (
                        <Tooltip title="Eliminar">
                            <IconButton
                                size="small"
                                onClick={() => onDelete(user)}
                                aria-label="Eliminar usuario"
                                sx={{ color: "error.main" }}
                            >
                                <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                    mt: 2,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Chip
                    label={user.role.toUpperCase()}
                    size="small"
                    variant="outlined"
                    sx={{
                        height: chipHeight,
                        borderRadius: chipRadius,
                        borderWidth: 1,
                        borderColor: alpha(accent, 0.85),
                        color: accent,
                        bgcolor: "transparent",
                        fontWeight: 700,
                        fontSize: "0.6875rem",
                        letterSpacing: 0.4,
                        "& .MuiChip-label": { px: 1.5, py: 0 },
                    }}
                />
                <Chip
                    label={`PERMISOS: ${user.permissionsCount}`}
                    size="small"
                    variant="filled"
                    sx={{
                        height: chipHeight,
                        borderRadius: chipRadius,
                        fontWeight: 700,
                        fontSize: "0.6875rem",
                        letterSpacing: 0.35,
                        bgcolor: (t) =>
                            t.palette.mode === "dark"
                                ? t.palette.background.tableHeader
                                : alpha(t.palette.grey[200], 1),
                        color: (t) =>
                            t.palette.mode === "dark"
                                ? "#ECE8DD"
                                : t.palette.text.primary,
                        boxShadow: "none",
                        "& .MuiChip-label": { px: 1.5, py: 0 },
                    }}
                />
            </Box>
        </Paper>
    );
}

interface SnackbarState {
    open: boolean;
    message: string;
    severity: "success" | "error";
}

export default function Users() {
    const [page, setPage]               = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [createOpen, setCreateOpen]     = useState(false);
    const [editOpen, setEditOpen]         = useState(false);
    const [deleteOpen, setDeleteOpen]     = useState(false);
    const [snackbar, setSnackbar]         = useState<SnackbarState>({ open: false, message: "", severity: "success" });

    const theme = useTheme();
    const { ready: layoutReady, isNarrow: isNarrowLayout } = useNarrowLayoutMd();
    const isIconOnlyCreate = useMediaQuery(theme.breakpoints.down("sm"));

    const canCreate = useHasPermission(PERMISSIONS.USERS.CREATE);
    const canUpdate = useHasPermission(PERMISSIONS.USERS.UPDATE);
    const canDelete = useHasPermission(PERMISSIONS.USERS.DELETE);
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchInput); setPage(0); }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data, loading, refetch } = useUsers({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: debouncedSearch || undefined,
    });

    const showSnackbar = (message: string, severity: "success" | "error" = "success") =>
        setSnackbar({ open: true, message, severity });

    const handleEdit = (user: User) => { setSelectedUser(user); setEditOpen(true); };
    const handleDelete = (user: User) => { setSelectedUser(user); setDeleteOpen(true); };

    const columns: TableColumn<User>[] = [
        {
            key: "index", label: "#", width: 60,
            render: (_, i) => page * rowsPerPage + i + 1,
        },
        {
            key: "avatarUrl",
            label: "Avatar",
            width: 70,
            align: "center",
            render: (row) => {
                const src = toMediaUrl(row.avatarUrl) || undefined;
                const initials = row.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                return (
                    <Avatar src={src} sx={{ width: 32, height: 32, fontSize: 12, bgcolor: "primary.main", mx: "auto" }}>
                        {!src && initials}
                    </Avatar>
                );
            },
        },
        { key: "name",  label: "Nombre",  width: 180 },
        { key: "email", label: "Correo",  width: 220 },
        { key: "role",  label: "Rol",     width: 140 },
        {
            key: "permissionsCount",
            label: "Permisos",
            width: 90,
            align: "center",
            render: (row) => (
                <Chip label={row.permissionsCount} size="small" variant="outlined" />
            ),
        },
        {
            key: "actions",
            label: "Acciones",
            width: 100,
            align: "center",
            render: (row) => (
                <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                    {mounted && canUpdate && (
                        <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleEdit(row)}>
                                <EditRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {mounted && canDelete && row.id !== currentUserId && (
                        <Tooltip title="Eliminar">
                            <IconButton size="small" onClick={() => handleDelete(row)} sx={{ color: "error.main" }}>
                                <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Gestión de usuarios
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
                    placeholder="Buscar usuario..."
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
                        aria-label="Crear usuario"
                        sx={{
                            flexShrink: 0,
                            minWidth: isIconOnlyCreate ? 44 : undefined,
                            px: isIconOnlyCreate ? 1 : undefined,
                        }}
                    >
                        {isIconOnlyCreate ? <AddRoundedIcon /> : "Crear usuario"}
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
                                    <Skeleton variant="rounded" height={148} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))
                        ) : (data?.results ?? []).length === 0 ? (
                            <Grid size={12}>
                                <Box sx={{ py: 6, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No hay datos disponibles.
                                    </Typography>
                                </Box>
                            </Grid>
                        ) : (
                            (data?.results ?? []).map((row) => (
                                <Grid key={row.id} size={{ xs: 12, sm: 6 }}>
                                    <UserMobileCard
                                        user={row}
                                        mounted={mounted}
                                        canUpdate={canUpdate}
                                        canDelete={canDelete}
                                        isSelf={row.id === currentUserId}
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
                        labelRowsPerPage={isIconOnlyCreate ? "Filas" : "Filas:"}
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
                        }
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            ) : (
                <DataTable<User>
                    columns={columns}
                    rows={data?.results ?? []}
                    loading={loading}
                    total={data?.count ?? 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
                    getRowKey={(row) => row.id}
                />
            )}

            <CreateUser
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Usuario creado exitosamente."); }}
            />
            <EditUser
                open={editOpen}
                user={selectedUser}
                onClose={() => setEditOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Usuario actualizado exitosamente."); }}
            />
            <DeleteUser
                open={deleteOpen}
                user={selectedUser}
                onClose={() => setDeleteOpen(false)}
                onSuccess={() => { refetch(); showSnackbar("Usuario eliminado exitosamente."); }}
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
