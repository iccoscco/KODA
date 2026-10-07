'use client';

import React, { useState, useMemo, useRef } from "react";
import {
    Box,
    Button,
    IconButton,
    Popover,
    Stack,
    Typography,
    Divider,
    InputBase,
    MenuItem,
    Select,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
// Using dialog action spacing inline to avoid importing the shared sx object here
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import dayjs from "dayjs";
import "dayjs/locale/es";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);
dayjs.locale("es");

export interface DateRange {
    startDate: Date;
    endDate: Date;
    hasTime: boolean;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (newValue: DateRange) => void;
    fullWidth?: boolean;
    allowTime?: boolean;
}

type PresetKey = "hoy" | "ayer" | "ultimos7" | "ultimos30" | "esteMes" | "mesPasado" | "trimestre" | "personalizado";

interface PresetOption {
    key: PresetKey;
    label: string;
    getRange: () => { start: Date; end: Date };
}

const PRESETS: PresetOption[] = [
    {
        key: "hoy",
        label: "Hoy",
        getRange: () => ({
            start: dayjs().startOf("day").toDate(),
            end: dayjs().endOf("day").toDate(),
        }),
    },
    {
        key: "ayer",
        label: "Ayer",
        getRange: () => ({
            start: dayjs().subtract(1, "day").startOf("day").toDate(),
            end: dayjs().subtract(1, "day").endOf("day").toDate(),
        }),
    },
    {
        key: "ultimos7",
        label: "Últimos 7 días",
        getRange: () => ({
            start: dayjs().subtract(7, "days").startOf("day").toDate(),
            end: dayjs().endOf("day").toDate(),
        }),
    },
    {
        key: "ultimos30",
        label: "Últimos 30 días",
        getRange: () => ({
            start: dayjs().subtract(30, "days").startOf("day").toDate(),
            end: dayjs().endOf("day").toDate(),
        }),
    },
    {
        key: "esteMes",
        label: "Este mes",
        getRange: () => ({
            start: dayjs().startOf("month").startOf("day").toDate(),
            end: dayjs().endOf("month").endOf("day").toDate(),
        }),
    },
    {
        key: "mesPasado",
        label: "Mes pasado",
        getRange: () => ({
            start: dayjs().subtract(1, "month").startOf("month").startOf("day").toDate(),
            end: dayjs().subtract(1, "month").endOf("month").endOf("day").toDate(),
        }),
    },
    {
        key: "trimestre",
        label: "Trimestre actual",
        getRange: () => {
            const currentMonth = dayjs().month();
            const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
            return {
                start: dayjs().month(quarterStartMonth).startOf("month").startOf("day").toDate(),
                end: dayjs().month(quarterStartMonth + 2).endOf("month").endOf("day").toDate(),
            };
        },
    },
    {
        key: "personalizado",
        label: "Rango personalizado",
        getRange: () => ({
            start: new Date(),
            end: new Date(),
        }),
    },
];

// ── Editable date input ───────────────────────────────────────────────────────

interface EditableDateInputProps {
    label: string;
    value: dayjs.Dayjs;
    onChange: (d: dayjs.Dayjs) => void;
}

function EditableDateInput({ label, value, onChange }: EditableDateInputProps) {
    const [raw, setRaw] = useState(value.format("DD/MM/YYYY"));
    const [isError, setIsError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setRaw(v);

        const parsed = dayjs(v, "DD/MM/YYYY", true);
        if (parsed.isValid()) {
            setIsError(false);
            onChange(parsed.hour(value.hour()).minute(value.minute()));
        } else {
            setIsError(true);
        }
    };

    const handleBlur = () => {
        // On blur, if invalid, restore the last valid value
        const parsed = dayjs(raw, "DD/MM/YYYY", true);
        if (!parsed.isValid()) {
            setRaw(value.format("DD/MM/YYYY"));
            setIsError(false);
        }
    };

    return (
        <Box
            sx={{
                position: "relative",
                width: 180,
                minWidth: 140,
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    position: "absolute",
                    top: -9,
                    left: 10,
                    px: 0.5,
                    bgcolor: "background.paper",
                    color: isError ? "error.main" : "text.secondary",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    zIndex: 1,
                    lineHeight: 1,
                }}
            >
                {label}
            </Typography>
            <InputBase
                inputRef={inputRef}
                value={raw}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="DD/MM/AAAA"
                inputProps={{ maxLength: 10, spellCheck: false }}
                sx={{
                    width: "100%",
                    border: "1px solid",
                    borderColor: isError
                        ? "error.main"
                        : (t) => alpha(t.palette.divider, 0.4),
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.75,
                    fontSize: "0.875rem",
                    fontFamily: "monospace",
                    letterSpacing: 0.5,
                    color: "text.primary",
                    bgcolor: "background.paper",
                    transition: "border-color 0.15s",
                    "&.Mui-focused": {
                        borderColor: isError ? "error.main" : "primary.main",
                        boxShadow: (t) =>
                            `0 0 0 2px ${alpha(
                                isError ? t.palette.error.main : t.palette.primary.main,
                                0.15
                            )}`,
                    },
                }}
            />
        </Box>
    );
}

// ── Year picker grid ──────────────────────────────────────────────────────────

interface YearPickerProps {
    currentYear: number;
    onSelect: (year: number) => void;
    onClose: () => void;
}

const YEARS_PER_PAGE = 12;

function YearPicker({ currentYear, onSelect, onClose }: YearPickerProps) {
    // pageOffset: how many pages away from the "home" page (centered on currentYear)
    const [pageOffset, setPageOffset] = useState(0);

    // Page start year: align to a block of YEARS_PER_PAGE starting near currentYear
    const homeBase = Math.floor(currentYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;
    const pageStart = homeBase + pageOffset * YEARS_PER_PAGE;
    const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i);

    const rangeLabel = `${years[0]} – ${years[years.length - 1]}`;

    return (
        <>
            {/* Transparent backdrop – click outside closes the picker */}
            <Box
                onClick={onClose}
                sx={{ position: "fixed", inset: 0, zIndex: 9 }}
            />
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "background.paper",
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                    borderRadius: 2,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}
            >
                {/* Header: prev / range label / next / close */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <IconButton
                        size="small"
                        onClick={() => setPageOffset(p => p - 1)}
                        sx={{ p: 0.5 }}
                    >
                        <ChevronLeftRoundedIcon fontSize="small" />
                    </IconButton>

                    <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5, userSelect: "none" }}
                    >
                        {rangeLabel}
                    </Typography>

                    <Stack direction="row" spacing={0.25}>
                        <IconButton
                            size="small"
                            onClick={() => setPageOffset(p => p + 1)}
                            sx={{ p: 0.5 }}
                        >
                            <ChevronRightRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{ p: 0.5, ml: 0.5, color: "text.disabled" }}
                            title="Cerrar"
                        >
                            <ChevronLeftRoundedIcon fontSize="small" sx={{ transform: "rotate(90deg)" }} />
                        </IconButton>
                    </Stack>
                </Stack>

                {/* Year grid */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 0.5,
                        flex: 1,
                    }}
                >
                    {years.map((yr) => {
                        const isActive = yr === currentYear;
                        return (
                            <Box
                                key={yr}
                                onClick={() => onSelect(yr)}
                                sx={{
                                    py: 1,
                                    borderRadius: 1.5,
                                    textAlign: "center",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    fontWeight: isActive ? 700 : 500,
                                    bgcolor: isActive ? "primary.main" : "transparent",
                                    color: isActive ? "primary.contrastText" : "text.primary",
                                    transition: "all 0.1s",
                                    "&:hover": {
                                        bgcolor: isActive
                                            ? "primary.dark"
                                            : (t) => alpha(t.palette.primary.main, 0.12),
                                    },
                                }}
                            >
                                {yr}
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DateRangePicker({ value, onChange, fullWidth, allowTime = false }: DateRangePickerProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    // Temp states for editing in the popover
    const [tempStart, setTempStart] = useState<dayjs.Dayjs>(dayjs(value.startDate));
    const [tempEnd, setTempEnd] = useState<dayjs.Dayjs>(dayjs(value.endDate));
    const [showTime, setShowTime] = useState<boolean>(allowTime ? value.hasTime : false);
    const [activePreset, setActivePreset] = useState<PresetKey>("personalizado");
    // ── Configuración del selector ───────────────────────────────────────────
    // awaitingEnd: true = primer clic hecho, falta el segundo (fecha fin).
    // Con rango ya definido: clic antes del inicio → mueve inicio; después del fin → mueve fin.
    const [awaitingEnd, setAwaitingEnd] = useState(false);

    // Calendar navigations: left calendar month, right calendar month
    const [leftMonth, setLeftMonth] = useState<dayjs.Dayjs>(dayjs(value.startDate).startOf("month"));
    const rightMonth = useMemo(() => leftMonth.add(1, "month"), [leftMonth]);

    // Year picker state: null = hidden, "left" | "right" = which calendar
    const [showYearPicker, setShowYearPicker] = useState<"left" | "right" | null>(null);

    // Handle open/close
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
        setTempStart(dayjs(value.startDate));
        setTempEnd(dayjs(value.endDate));
        setShowTime(allowTime ? value.hasTime : false);
        setLeftMonth(dayjs(value.startDate).startOf("month"));
        setShowYearPicker(null);
        setAwaitingEnd(false);

        // Find matching preset
        const match = PRESETS.find(p => {
            const range = p.getRange();
            return dayjs(range.start).isSame(dayjs(value.startDate), "minute") &&
                   dayjs(range.end).isSame(dayjs(value.endDate), "minute");
        });
        setActivePreset(match ? match.key : "personalizado");
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleApply = () => {
        onChange({
            startDate: tempStart.toDate(),
            endDate: tempEnd.toDate(),
            hasTime: allowTime ? showTime : false,
        });
        handleClose();
    };

    const selectPreset = (preset: PresetOption) => {
        setActivePreset(preset.key);
        setShowYearPicker(null);
        setAwaitingEnd(false);
        if (preset.key !== "personalizado") {
            const range = preset.getRange();
            setTempStart(dayjs(range.start));
            setTempEnd(dayjs(range.end));
            setLeftMonth(dayjs(range.start).startOf("month"));
        }
    };

    // Calendar navigation
    const handlePrevMonth = () => {
        setLeftMonth(prev => prev.subtract(1, "month"));
        setShowYearPicker(null);
    };

    const handleNextMonth = () => {
        setLeftMonth(prev => prev.add(1, "month"));
        setShowYearPicker(null);
    };

    // Year picker handlers
    const handleYearSelect = (year: number) => {
        if (showYearPicker === "left") {
            setLeftMonth(leftMonth.year(year));
        } else if (showYearPicker === "right") {
            // Right calendar is always leftMonth+1; so move leftMonth back one month then set year
            setLeftMonth(rightMonth.year(year).subtract(1, "month"));
        }
        setShowYearPicker(null);
    };

    // Calendario: 1er clic = inicio, 2do = fin. Si el rango ya existe, se puede mover cada extremo por separado.
    const handleDateClick = (date: dayjs.Dayjs) => {
        setActivePreset("personalizado");
        setShowYearPicker(null);

        const clicked = date.startOf("day");
        const start = tempStart.startOf("day");
        const end = tempEnd.startOf("day");

        if (awaitingEnd) {
            let newStart = tempStart;
            let newEnd = date.hour(tempEnd.hour()).minute(tempEnd.minute());
            if (newEnd.isBefore(newStart, "day")) {
                newStart = newEnd.hour(tempStart.hour()).minute(tempStart.minute());
                newEnd = tempStart.hour(tempEnd.hour()).minute(tempEnd.minute());
            }
            setTempStart(newStart);
            setTempEnd(newEnd);
            setAwaitingEnd(false);
            return;
        }

        // Rango ya definido: permitir mover inicio o fin sin bloquear un extremo
        if (!start.isSame(end, "day")) {
            if (clicked.isBefore(start, "day")) {
                setTempStart(date.hour(tempStart.hour()).minute(tempStart.minute()));
                return;
            }
            if (clicked.isAfter(end, "day")) {
                setTempEnd(date.hour(tempEnd.hour()).minute(tempEnd.minute()));
                return;
            }
            if (clicked.isSame(start, "day")) {
                setTempStart(date.hour(tempStart.hour()).minute(tempStart.minute()));
                setTempEnd(date.hour(tempEnd.hour()).minute(tempEnd.minute()));
                setAwaitingEnd(true);
                return;
            }
            if (clicked.isSame(end, "day")) {
                setAwaitingEnd(true);
                return;
            }
        }

        // Nuevo rango: primer clic fija inicio, el siguiente la fin
        setTempStart(date.hour(tempStart.hour()).minute(tempStart.minute()));
        setTempEnd(date.hour(tempEnd.hour()).minute(tempEnd.minute()));
        setAwaitingEnd(true);
    };

    // Helper to generate calendar matrix
    const getDaysInMonth = (monthDate: dayjs.Dayjs) => {
        const startDay = monthDate.startOf("month").day(); // 0 is Sun
        const startOffset = startDay === 0 ? 6 : startDay - 1;
        const totalDays = monthDate.daysInMonth();
        const days: { date: dayjs.Dayjs; isCurrentMonth: boolean }[] = [];

        const prevMonth = monthDate.subtract(1, "month");
        const prevDaysTotal = prevMonth.daysInMonth();
        for (let i = startOffset - 1; i >= 0; i--) {
            days.push({ date: prevMonth.date(prevDaysTotal - i), isCurrentMonth: false });
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push({ date: monthDate.date(i), isCurrentMonth: true });
        }
        const nextMonth = monthDate.add(1, "month");
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: nextMonth.date(i), isCurrentMonth: false });
        }
        return days;
    };

    const leftDays = useMemo(() => getDaysInMonth(leftMonth), [leftMonth]);
    const rightDays = useMemo(() => getDaysInMonth(rightMonth), [rightMonth]);

    const isDateSelected = (date: dayjs.Dayjs) =>
        date.isSame(tempStart, "day") || date.isSame(tempEnd, "day");

    const isDateInRange = (date: dayjs.Dayjs) =>
        date.isAfter(tempStart, "day") && date.isBefore(tempEnd, "day");

    const open = Boolean(anchorEl);
    const id = open ? "shopify-daterange-popover" : undefined;

    // Display formatted range — año corto DD/MM/YY para que quepa en botón estrecho
    const triggerText = useMemo(() => {
        const fmt = (allowTime && value.hasTime) ? "DD/MM/YY HH:mm" : "DD/MM/YY";
        const startFmt = dayjs(value.startDate).format(fmt);
        const endFmt   = dayjs(value.endDate).format(fmt);
        if (dayjs(value.startDate).isSame(dayjs(value.endDate), "day")) return startFmt;
        return `${startFmt} → ${endFmt}`;
    }, [value, allowTime]);

    return (
        <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
            <Button
                variant="outlined"
                onClick={handleClick}
                fullWidth={fullWidth}
                startIcon={<CalendarTodayRoundedIcon fontSize="small" />}
                endIcon={<KeyboardArrowDownRoundedIcon />}
                sx={{
                    textTransform: "none",
                    borderColor: (t) => alpha(t.palette.divider, 0.25),
                    color: "text.primary",
                    borderRadius: 2,
                    fontWeight: 600,
                    px: 1.5,
                    height: 40,
                    justifyContent: "space-between",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    bgcolor: "background.paper",
                    "& .MuiButton-startIcon": { flexShrink: 0 },
                    "& .MuiButton-endIcon": { ml: "auto", flexShrink: 0 },
                    "& .MuiButton-label, & span:not(.MuiButton-startIcon):not(.MuiButton-endIcon)": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    },
                    "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                    }
                }}
            >
                {triggerText}
            </Button>

            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            borderRadius: 3,
                            boxShadow: "0px 8px 30px rgba(0, 0, 0, 0.12)",
                            border: "1px solid",
                            borderColor: (t) => alpha(t.palette.divider, 0.08),
                            bgcolor: "background.paper",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            maxWidth: "100%",
                        }
                    }
                }}
            >
                <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
                    {/* Left Panel: Preset Ranges */}
                    <Box
                        sx={{
                            width: { xs: "100%", md: 190 },
                            bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.background.default, 0.4) : alpha(t.palette.grey[50], 0.8),
                            borderRight: "1px solid",
                            borderColor: "divider",
                            p: 1.5,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                        }}
                    >
                        <Typography variant="overline" color="text.secondary" sx={{ px: 1, fontWeight: 700, mb: 0.5 }}>
                            Período
                        </Typography>
                        {PRESETS.map((p) => {
                            const active = activePreset === p.key;
                            return (
                                <Box
                                    key={p.key}
                                    onClick={() => selectPreset(p)}
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        borderRadius: 2,
                                        cursor: "pointer",
                                        fontWeight: active ? 700 : 500,
                                        fontSize: "0.85rem",
                                        bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.1) : "transparent",
                                        color: active ? "primary.main" : "text.primary",
                                        transition: "all 0.15s",
                                        "&:hover": {
                                            bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.15) : "action.hover",
                                        }
                                    }}
                                >
                                    {p.label}
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Right Panel: Double Calendars + Dates Header */}
                    <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                        {/* Top: Editable date inputs + clock toggle */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <Stack direction="row" alignItems="center" spacing={1.5} flex={1} justifyContent="center">
                                <EditableDateInput
                                    key={`start-${tempStart.valueOf()}`}
                                    label="Inicio"
                                    value={tempStart}
                                    onChange={(d) => {
                                        setTempStart(d);
                                        setActivePreset("personalizado");
                                        setAwaitingEnd(false);
                                        setLeftMonth(d.startOf("month"));
                                        if (d.isAfter(tempEnd, "day")) {
                                            setTempEnd(d.endOf("day"));
                                        }
                                    }}
                                />
                                <Typography color="text.secondary">→</Typography>
                                <EditableDateInput
                                    key={`end-${tempEnd.valueOf()}`}
                                    label="Fin"
                                    value={tempEnd}
                                    onChange={(d) => {
                                        setTempEnd(d);
                                        setActivePreset("personalizado");
                                        setAwaitingEnd(false);
                                        if (d.isBefore(tempStart, "day")) {
                                            setTempStart(d.startOf("day"));
                                        }
                                    }}
                                />
                            </Stack>

                            {/* Clock button (visible only when time filtering is allowed) */}
                            {allowTime && (
                                <IconButton
                                    color={showTime ? "primary" : "default"}
                                    onClick={() => setShowTime(!showTime)}
                                    sx={{
                                        border: "1px solid",
                                        borderColor: showTime ? "primary.main" : "divider",
                                        borderRadius: 2,
                                        bgcolor: showTime ? (t) => alpha(t.palette.primary.main, 0.06) : "transparent",
                                        p: 1,
                                    }}
                                >
                                    <AccessTimeRoundedIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Stack>

                        {/* Time selectors (only when clock is toggled) */}
                        {showTime && (
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2.5,
                                    bgcolor: (t) => alpha(t.palette.action.hover, 0.5),
                                    border: "1px dashed",
                                    borderColor: "divider",
                                    display: "flex",
                                    gap: 3,
                                    justifyContent: "space-between",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">Hora Inicio:</Typography>
                                    <Select
                                        size="small"
                                        value={tempStart.hour()}
                                        onChange={(e) => setTempStart(tempStart.hour(Number(e.target.value)))}
                                        sx={{ height: 32, fontSize: "0.85rem", width: 65 }}
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <MenuItem key={i} value={i}>{String(i).padStart(2, "0")}</MenuItem>
                                        ))}
                                    </Select>
                                    <Typography variant="body2">:</Typography>
                                    <Select
                                        size="small"
                                        value={tempStart.minute()}
                                        onChange={(e) => setTempStart(tempStart.minute(Number(e.target.value)))}
                                        sx={{ height: 32, fontSize: "0.85rem", width: 65 }}
                                    >
                                        {Array.from({ length: 60 }).map((_, i) => (
                                            <MenuItem key={i} value={i}>{String(i).padStart(2, "0")}</MenuItem>
                                        ))}
                                    </Select>
                                </Box>

                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">Hora Fin:</Typography>
                                    <Select
                                        size="small"
                                        value={tempEnd.hour()}
                                        onChange={(e) => setTempEnd(tempEnd.hour(Number(e.target.value)))}
                                        sx={{ height: 32, fontSize: "0.85rem", width: 65 }}
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <MenuItem key={i} value={i}>{String(i).padStart(2, "0")}</MenuItem>
                                        ))}
                                    </Select>
                                    <Typography variant="body2">:</Typography>
                                    <Select
                                        size="small"
                                        value={tempEnd.minute()}
                                        onChange={(e) => setTempEnd(tempEnd.minute(Number(e.target.value)))}
                                        sx={{ height: 32, fontSize: "0.85rem", width: 65 }}
                                    >
                                        {Array.from({ length: 60 }).map((_, i) => (
                                            <MenuItem key={i} value={i}>{String(i).padStart(2, "0")}</MenuItem>
                                        ))}
                                    </Select>
                                </Box>
                            </Box>
                        )}

                        {/* Calendar Grids */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ mt: 1 }}>
                            {/* Calendar 1 (Left Month) */}
                            <Box sx={{ width: 230, position: "relative" }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                    <IconButton size="small" onClick={handlePrevMonth}>
                                        <ChevronLeftRoundedIcon />
                                    </IconButton>
                                    <Box
                                        onClick={() => setShowYearPicker(prev => prev === "left" ? null : "left")}
                                        sx={{
                                            cursor: "pointer",
                                            borderRadius: 1.5,
                                            px: 1,
                                            py: 0.5,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            bgcolor: showYearPicker === "left"
                                                ? (t) => alpha(t.palette.primary.main, 0.1)
                                                : "transparent",
                                            "&:hover": {
                                                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                                            },
                                            transition: "background-color 0.15s",
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: "capitalize", color: showYearPicker === "left" ? "primary.main" : "text.primary" }}>
                                            {leftMonth.format("MMMM YYYY")}
                                        </Typography>
                                        <KeyboardArrowDownRoundedIcon
                                            sx={{
                                                fontSize: 16,
                                                color: showYearPicker === "left" ? "primary.main" : "text.secondary",
                                                transform: showYearPicker === "left" ? "rotate(180deg)" : "none",
                                                transition: "transform 0.2s",
                                            }}
                                        />
                                    </Box>
                                    <Box width={34} />
                                </Stack>

                                {showYearPicker === "left" ? (
                                    <YearPicker
                                        currentYear={leftMonth.year()}
                                        onSelect={handleYearSelect}
                                        onClose={() => setShowYearPicker(null)}
                                    />
                                ) : (
                                    <CalendarGrid
                                        days={leftDays}
                                        isDateSelected={isDateSelected}
                                        isDateInRange={isDateInRange}
                                        onDateClick={handleDateClick}
                                    />
                                )}
                            </Box>

                            {/* Calendar 2 (Right Month) */}
                            <Box sx={{ width: 230, position: "relative" }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                    <Box width={34} />
                                    <Box
                                        onClick={() => setShowYearPicker(prev => prev === "right" ? null : "right")}
                                        sx={{
                                            cursor: "pointer",
                                            borderRadius: 1.5,
                                            px: 1,
                                            py: 0.5,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            bgcolor: showYearPicker === "right"
                                                ? (t) => alpha(t.palette.primary.main, 0.1)
                                                : "transparent",
                                            "&:hover": {
                                                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                                            },
                                            transition: "background-color 0.15s",
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: "capitalize", color: showYearPicker === "right" ? "primary.main" : "text.primary" }}>
                                            {rightMonth.format("MMMM YYYY")}
                                        </Typography>
                                        <KeyboardArrowDownRoundedIcon
                                            sx={{
                                                fontSize: 16,
                                                color: showYearPicker === "right" ? "primary.main" : "text.secondary",
                                                transform: showYearPicker === "right" ? "rotate(180deg)" : "none",
                                                transition: "transform 0.2s",
                                            }}
                                        />
                                    </Box>
                                    <IconButton size="small" onClick={handleNextMonth}>
                                        <ChevronRightRoundedIcon />
                                    </IconButton>
                                </Stack>

                                {showYearPicker === "right" ? (
                                    <YearPicker
                                        currentYear={rightMonth.year()}
                                        onSelect={handleYearSelect}
                                        onClose={() => setShowYearPicker(null)}
                                    />
                                ) : (
                                    <CalendarGrid
                                        days={rightDays}
                                        isDateSelected={isDateSelected}
                                        isDateInRange={isDateInRange}
                                        onDateClick={handleDateClick}
                                    />
                                )}
                            </Box>
                        </Stack>
                    </Box>
                </Box>

                <Divider />

                {/* Footer */}
                <Box sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderColor: (t) => alpha(t.palette.divider, 0.12) }}>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", px: { xs: 1.5, sm: 3 }, py: 2, gap: 1, flexShrink: 0, flexDirection: { xs: "column-reverse", sm: "row" }, "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>
                        <Button variant="outlined" onClick={handleClose} sx={{ textTransform: "none" }}>Cancelar</Button>
                        <Button variant="contained" onClick={handleApply} sx={{ textTransform: "none", fontWeight: 700 }}>Aplicar</Button>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
}

// ── Calendar Grid Helper Component ────────────────────────────────────────────

interface CalendarGridProps {
    days: { date: dayjs.Dayjs; isCurrentMonth: boolean }[];
    isDateSelected: (date: dayjs.Dayjs) => boolean;
    isDateInRange: (date: dayjs.Dayjs) => boolean;
    onDateClick: (date: dayjs.Dayjs) => void;
}

function CalendarGrid({
    days,
    isDateSelected,
    isDateInRange,
    onDateClick,
}: CalendarGridProps) {
    const weekdays = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

    return (
        <Box>
            {/* Weekdays Header */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 1, textAlign: "center" }}>
                {weekdays.map((d) => (
                    <Typography
                        key={d}
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.5 }}
                    >
                        {d}
                    </Typography>
                ))}
            </Box>

            {/* Days Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                {days.map((day, idx) => {
                    const selected = isDateSelected(day.date);
                    const inRange = isDateInRange(day.date);
                    const isMuted = !day.isCurrentMonth;

                    return (
                        <Box
                            key={idx}
                            onClick={() => onDateClick(day.date)}
                            sx={{
                                height: 32,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: selected ? 700 : 500,
                                borderRadius: selected ? 1.5 : 0,
                                position: "relative",
                                bgcolor: selected
                                    ? "primary.main"
                                    : inRange
                                        ? (t) => alpha(t.palette.primary.main, 0.08)
                                        : "transparent",
                                color: selected
                                    ? "primary.contrastText"
                                    : isMuted
                                        ? "text.disabled"
                                        : "text.primary",
                                transition: "all 0.1s",
                                "&:hover": {
                                    bgcolor: selected
                                        ? "primary.dark"
                                        : (t) => alpha(t.palette.primary.main, 0.15),
                                    borderRadius: 1.5,
                                }
                            }}
                        >
                            {day.date.date()}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
