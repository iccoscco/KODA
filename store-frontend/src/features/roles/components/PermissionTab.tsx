'use client';

import { useEffect, useState } from "react";
import { Box, Grid, Paper, Skeleton, TablePagination, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import DataTable, { TableColumn } from "@/shared/components/DataTable";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import { ListLayoutMeasurePlaceholder } from "@/shared/components/ListLayoutMeasurePlaceholder";
import { useNarrowLayoutMd } from "@/shared/hooks/useNarrowLayoutMd";
import {
    getPermissionDescriptionEs,
    getPermissionLabelEs,
} from "@/shared/config/permissionLabels.es";
import { usePermissions } from "../hooks/rolesHooks";
import { Permission } from "../types/rolesTypes";

interface PermissionTabProps {
    search: string;
}

function PermissionMobileCard({ row }: { row: Permission }) {
    const title = row.labelEs ?? getPermissionLabelEs(row.name);
    const description = row.descriptionEs ?? getPermissionDescriptionEs(row.name, row.description);

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
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.35, mb: 1 }}>
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word", fontSize: "0.85rem" }}>
                {description}
            </Typography>
        </Paper>
    );
}

export default function PermissionTab({ search }: PermissionTabProps) {
    const [page, setPage]               = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const theme = useTheme();
    const { ready: layoutReady, isNarrow: isNarrowLayout } = useNarrowLayoutMd();
    const isShortLabel = useMediaQuery(theme.breakpoints.down("sm"));

    const { data, loading } = usePermissions({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: search.trim() || undefined,
    });

    useEffect(() => {
        setPage(0);
    }, [search]);

    const handleRowsPerPageChange = (newRows: number) => {
        setRowsPerPage(newRows);
        setPage(0);
    };

    const columns: TableColumn<Permission>[] = [
        {
            key: "index", label: "#", width: 60,
            render: (_, i) => page * rowsPerPage + i + 1,
        },
        {
            key: "name",
            label: "Nombre",
            render: (row) => row.labelEs ?? getPermissionLabelEs(row.name),
        },
        {
            key: "description",
            label: "Descripción",
            render: (row) =>
                row.descriptionEs ?? getPermissionDescriptionEs(row.name, row.description),
        },
    ];

    return (
        <>
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
                                    <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))
                        ) : (data?.results ?? []).length === 0 ? (
                            <Grid size={12}>
                                <Box sx={{ py: 6, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No se encontraron permisos.
                                    </Typography>
                                </Box>
                            </Grid>
                        ) : (
                            (data?.results ?? []).map((row) => (
                                <Grid key={row.id} size={{ xs: 12, sm: 6 }}>
                                    <PermissionMobileCard row={row} />
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
                        onRowsPerPageChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={isShortLabel ? "Filas" : "Filas:"}
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
                        }
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            ) : (
                <DataTable<Permission>
                    columns={columns}
                    rows={data?.results ?? []}
                    total={data?.count ?? 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    getRowKey={(row) => row.id}
                    loading={loading}
                    emptyMessage="No se encontraron permisos."
                />
            )}
        </>
    );
}
