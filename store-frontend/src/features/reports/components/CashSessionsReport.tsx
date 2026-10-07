"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert, Box, Button, Chip, CircularProgress, Collapse, Divider,
    FormControl, IconButton, InputLabel, MenuItem, Paper, Select,
    Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, Tooltip, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import InlineLoading from "@/shared/components/InlineLoading";
import { compactTablePaginationSx } from "@/shared/mui/compactTablePaginationSx";
import { CashService } from "@/features/cash/services/cash.service";
import type { CashRegisterRow } from "@/features/cash/types/cashTypes";
import { ReportsService } from "../services/reports.service";
import type { CashSessionReport, CashSessionFilters } from "../types/reportsTypes";
import ReportSessionSales from "./ReportSessionSales";
import { formatDateTime as fmtDt } from "@/shared/utils/dateFormat";

const currency = (v: number | null | undefined) =>
    v == null ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

function SessionDetailLine({ label, value }: { label: string; value: string }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                columnGap: 1.5,
                alignItems: "start",
                py: 0.35,
            }}
        >
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, lineHeight: 1.35 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "nowrap", textAlign: "right" }}>
                {value}
            </Typography>
        </Box>
    );
}

/** Vista móvil: una tarjeta por sesión; ventas al expandir (misma carga que la tabla). */
function SessionMobileAccordion({ session, index }: { session: CashSessionReport; index: number }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Accordion
            expanded={expanded}
            onChange={(_, exp) => setExpanded(exp)}
            disableGutters
            elevation={0}
            sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
                "&:before": { display: "none" },
            }}
        >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 1.5, alignItems: "flex-start" }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.75, py: 0.5, textAlign: "left" }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        #{index + 1} · {session.cashRegisterName}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                        <Chip
                            size="small"
                            label={session.isActive ? "Abierta" : "Cerrada"}
                            color={session.isActive ? "warning" : "default"}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                            Apertura: {fmtDt(session.openedAt)}
                        </Typography>
                    </Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 2, bgcolor: "action.hover" }}>
                <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                    <SessionDetailLine label="Cierre" value={fmtDt(session.closedAt)} />
                    <SessionDetailLine label="Monto inicial" value={currency(session.initialAmount)} />
                    <SessionDetailLine label="Monto cierre" value={currency(session.closingAmount)} />
                    <SessionDetailLine label="Balance sistema" value={currency(session.systemBalance)} />
                    <SessionDetailLine
                        label="Diferencia"
                        value={currency(session.difference)}
                    />
                </Stack>
                {expanded && (
                    <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                        <ReportSessionSales sessionId={session.id} />
                    </Box>
                )}
            </AccordionDetails>
        </Accordion>
    );
}

function SessionRow({ session, index }: { session: CashSessionReport; index: number }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover>
                <TableCell sx={{ width: 44, p: "4px 8px" }}>
                    <Tooltip title={open ? "Ocultar ventas" : "Ver ventas"}>
                        <IconButton size="small" onClick={() => setOpen((v) => !v)}>
                            {open
                                ? <KeyboardArrowUpRoundedIcon fontSize="small" />
                                : <KeyboardArrowDownRoundedIcon fontSize="small" />
                            }
                        </IconButton>
                    </Tooltip>
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{session.cashRegisterName}</TableCell>
                <TableCell>{fmtDt(session.openedAt)}</TableCell>
                <TableCell>{fmtDt(session.closedAt)}</TableCell>
                <TableCell align="right">{currency(session.initialAmount)}</TableCell>
                <TableCell align="right">{currency(session.closingAmount)}</TableCell>
                <TableCell align="right">{currency(session.systemBalance)}</TableCell>
                <TableCell align="right">
                    <Typography
                        variant="body2"
                        color={session.difference != null && session.difference < 0 ? "error" : "text.primary"}
                        fontWeight={session.difference != null && session.difference !== 0 ? 600 : undefined}
                    >
                        {currency(session.difference)}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Chip
                        size="small"
                        label={session.isActive ? "Abierta" : "Cerrada"}
                        color={session.isActive ? "warning" : "default"}
                    />
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={10} sx={{ p: 0, borderBottom: open ? undefined : "none" }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ bgcolor: "action.hover" }}>
                            <Divider />
                            <ReportSessionSales sessionId={session.id} />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export default function CashSessionsReport() {
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

    const [registers, setRegisters] = useState<CashRegisterRow[]>([]);
    const [sessions, setSessions]   = useState<CashSessionReport[]>([]);
    const [total, setTotal]         = useState(0);
    /** `true` al montar evita un frame de “vacío” antes del primer fetch. */
    const [loading, setLoading]     = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [page, setPage]           = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filters, setFilters] = useState<CashSessionFilters>({
        cashRegisterId: "",
        startDate: "",
        endDate: "",
        status: "",
    });

    // Estado local para los DatePickers (Dayjs | null)
    const [fromDate, setFromDate] = useState<Dayjs | null>(null);
    const [toDate, setToDate]     = useState<Dayjs | null>(null);

    useEffect(() => {
        CashService.listRegisters().then(setRegisters).catch(() => {});
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await ReportsService.getCashSessions(filters, {
                limit: rowsPerPage,
                offset: page * rowsPerPage,
            });
            setSessions(data.results);
            setTotal(data.count);
        } catch {
            setError("Error al cargar el historial de caja");
        } finally {
            setLoading(false);
        }
    }, [filters, page, rowsPerPage]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Al cambiar filtros, volver a la primera página
    const handleFilterChange = (patch: Partial<CashSessionFilters>) => {
        setPage(0);
        setFilters((f) => ({ ...f, ...patch }));
    };

    // Convenio con el backend: instantes ISO-8601 UTC.
    //   - startDate: inicio del día local elegido (inclusivo).
    //   - endDate: inicio del día SIGUIENTE local (exclusivo).
    // dayjs trabaja en la zona del navegador y toISOString() emite el instante
    // UTC equivalente ("Z"). El backend corre con TZ=UTC y guarda las fechas en UTC.
    const handleFromDate = (value: Dayjs | null) => {
        setFromDate(value);
        handleFilterChange({
            startDate: value ? value.startOf("day").toISOString() : "",
        });
    };

    const handleToDate = (value: Dayjs | null) => {
        setToDate(value);
        handleFilterChange({
            endDate: value ? value.add(1, "day").startOf("day").toISOString() : "",
        });
    };

    const handleExport = async () => {
        setExporting(true);
        try { await ReportsService.exportCashSessionsPdf(filters); }
        catch { setError("Error al exportar el PDF"); }
        finally { setExporting(false); }
    };

    /** Evita warning aria-hidden al cerrar el calendario (Dialog móvil / Popper escritorio). */
    const datePickerSlotProps = {
        textField: { size: "small" as const, fullWidth: true, sx: { width: { xs: "100%", sm: 210 } } },
        field: { clearable: true },
        dialog: { disableRestoreFocus: true },
        desktopTrapFocus: { disableRestoreFocus: true },
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* Filtros + Exportar */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    flexWrap: "wrap",
                    gap: 1.5,
                    alignItems: { xs: "stretch", sm: "center" },
                }}
            >
                <FormControl size="small" sx={{ minWidth: { sm: 150 }, width: { xs: "100%", sm: "auto" } }}>
                    <InputLabel>Caja</InputLabel>
                    <Select
                        label="Caja"
                        value={filters.cashRegisterId ?? ""}
                        onChange={(e) => handleFilterChange({ cashRegisterId: e.target.value as number | "" })}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {registers.map((r) => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <DatePicker
                    label="Desde"
                    value={fromDate}
                    onChange={handleFromDate}
                    maxDate={toDate ?? undefined}
                    slotProps={datePickerSlotProps}
                />
                <DatePicker
                    label="Hasta"
                    value={toDate}
                    onChange={handleToDate}
                    minDate={fromDate ?? undefined}
                    slotProps={datePickerSlotProps}
                />

                <FormControl size="small" sx={{ minWidth: { sm: 130 }, width: { xs: "100%", sm: "auto" } }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                        label="Estado"
                        value={filters.status ?? ""}
                        onChange={(e) => handleFilterChange({ status: e.target.value })}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        <MenuItem value="OPEN">Abiertas</MenuItem>
                        <MenuItem value="CLOSED">Cerradas</MenuItem>
                    </Select>
                </FormControl>

                <Tooltip title="Exportar PDF" sx={{ ml: { sm: "auto" } }}>
                    <span>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={exporting
                                ? <CircularProgress size={16} color="inherit" />
                                : <PictureAsPdfRoundedIcon />}
                            onClick={handleExport}
                            disabled={exporting || total === 0}
                            sx={{ width: { xs: "100%", sm: "auto" } }}
                        >
                            Exportar PDF
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {loading ? (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <InlineLoading />
                </Paper>
            ) : total === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                    No hay sesiones con los filtros aplicados.
                </Typography>
            ) : isMdUp ? (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 44 }} />
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>#</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>Caja</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>Apertura</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>Cierre</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>M.Inicial</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>M.Cierre</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>Balance</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>Diferencia</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap", py: 1.5 }}>Estado</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sessions.map((s, i) => (
                                    <SessionRow key={s.id} session={s} index={page * rowsPerPage + i} />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="Filas:"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <Stack spacing={1.25} sx={{ p: 1.5 }}>
                        {sessions.map((s, i) => (
                            <SessionMobileAccordion
                                key={s.id}
                                session={s}
                                index={page * rowsPerPage + i}
                            />
                        ))}
                    </Stack>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="Filas"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                        sx={compactTablePaginationSx}
                    />
                </Paper>
            )}
        </Box>
    );
}
