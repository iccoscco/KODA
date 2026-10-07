"use client";

import { useState, ReactNode } from "react";
import {
    Box,
    Collapse,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
} from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";

export interface CollapsibleColumn<T> {
    key: string;
    label: string;
    width?: number | string;
    align?: "left" | "right" | "center";
    render?: (row: T, index: number) => ReactNode;
}

interface CollapsibleRowProps<T extends object> {
    row: T;
    index: number;
    columns: CollapsibleColumn<T>[];
    renderExpanded: (row: T) => ReactNode;
    expandTooltip?: string;
    collapseTooltip?: string;
    /** Si es true, la fila inicia desplegada (p. ej. búsqueda activa). */
    initialExpanded?: boolean;
}

function CollapsibleRow<T extends object>({
    row,
    index,
    columns,
    renderExpanded,
    expandTooltip = "Ver detalle",
    collapseTooltip = "Ocultar detalle",
    initialExpanded = false,
}: CollapsibleRowProps<T>) {
    const [open, setOpen] = useState(initialExpanded);

    return (
        <>
            <TableRow hover>
                <TableCell sx={{ width: 44, p: "4px 8px" }}>
                    <Tooltip title={open ? collapseTooltip : expandTooltip}>
                        <IconButton size="small" onClick={() => setOpen((prev) => !prev)}>
                            {open
                                ? <KeyboardArrowUpRoundedIcon fontSize="small" />
                                : <KeyboardArrowDownRoundedIcon fontSize="small" />
                            }
                        </IconButton>
                    </Tooltip>
                </TableCell>
                {columns.map((col) => (
                    <TableCell key={col.key} align={col.align} sx={{ width: col.width }}>
                        {col.render
                            ? col.render(row, index)
                            : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                ))}
            </TableRow>
            <TableRow>
                <TableCell
                    colSpan={columns.length + 1}
                    sx={{ p: 0, borderBottom: open ? undefined : "none" }}
                >
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 1.5, bgcolor: "action.hover" }}>
                            {renderExpanded(row)}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export interface CollapsibleTableProps<T extends object> {
    columns: CollapsibleColumn<T>[];
    rows: T[];
    getRowKey: (row: T) => string | number;
    renderExpanded: (row: T) => ReactNode;
    expandTooltip?: string;
    collapseTooltip?: string;
    /**
     * Si true, las filas inician abiertas (útil cuando hay filtros y el detalle es lo buscado).
     * `expandSignal` debe cambiar al variar criterios o página para volver a abrir tras un colapso manual.
     */
    defaultExpanded?: boolean;
    /** Se concatena a la key de fila cuando `defaultExpanded`; al cambiar, React remonta y reaplica apertura. */
    expandSignal?: string;
}

export default function CollapsibleTable<T extends object>({
    columns,
    rows,
    getRowKey,
    renderExpanded,
    expandTooltip,
    collapseTooltip,
    defaultExpanded = false,
    expandSignal = "",
}: CollapsibleTableProps<T>) {
    const rowKeySuffix = defaultExpanded ? expandSignal : "collapsed";

    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell sx={{ width: 44 }} />
                    {columns.map((col) => (
                        <TableCell key={col.key} align={col.align} sx={{ width: col.width }}>
                            {col.label}
                        </TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map((row, i) => (
                    <CollapsibleRow
                        key={`${getRowKey(row)}-${rowKeySuffix}`}
                        row={row}
                        index={i}
                        columns={columns}
                        renderExpanded={renderExpanded}
                        expandTooltip={expandTooltip}
                        collapseTooltip={collapseTooltip}
                        initialExpanded={defaultExpanded}
                    />
                ))}
            </TableBody>
        </Table>
    );
}
