'use client';

import {
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import InlineLoading from "@/shared/components/InlineLoading";

export interface TableColumn<T> {
    key: string;
    label: string;
    width?: string | number;
    align?: "left" | "center" | "right";
    render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: TableColumn<T>[];
    rows: T[];
    total: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (newPage: number) => void;
    onRowsPerPageChange: (newRowsPerPage: number) => void;
    getRowKey: (row: T) => string | number;
    getRowSx?: (row: T) => object | undefined;
    loading?: boolean;
    /** `"skeleton"` (por defecto) o mensaje + spinner compacto. */
    loadingVariant?: "skeleton" | "message";
    emptyMessage?: string;
    /** Estilos extra para `TablePagination` (p. ej. paginación compacta en móvil). */
    tablePaginationSx?: SxProps<Theme>;
}

export default function DataTable<T>({
    columns,
    rows,
    total,
    page,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    getRowKey,
    getRowSx,
    loading = false,
    loadingVariant = "skeleton",
    emptyMessage = "No hay datos disponibles.",
    tablePaginationSx,
}: DataTableProps<T>) {
    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.key}
                                    align={col.align ?? "left"}
                                    width={col.width}
                                    sx={{ whiteSpace: "nowrap", py: 1.5 }}
                                >
                                    {col.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            loadingVariant === "message" ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center" sx={{ py: 0, borderBottom: 0 }}>
                                        <InlineLoading />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                Array.from({ length: rowsPerPage }).map((_, i) => (
                                    <TableRow key={i}>
                                        {columns.map((col) => (
                                            <TableCell key={col.key}>
                                                <Skeleton variant="text" width="80%" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {emptyMessage}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row, rowIndex) => (
                                <TableRow
                                    key={getRowKey(row)}
                                    hover
                                    sx={{ "&:last-child td": { borderBottom: 0 }, ...getRowSx?.(row) }}
                                >
                                    {columns.map((col) => (
                                        <TableCell key={col.key} align={col.align ?? "left"}>
                                            {col.render
                                                ? col.render(row, rowIndex)
                                                : String((row as Record<string, unknown>)[col.key] ?? "—")
                                            }
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_, newPage) => onPageChange(newPage)}
                onRowsPerPageChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Filas:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                sx={tablePaginationSx}
            />
        </Paper>
    );
}
