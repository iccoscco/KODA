'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { ApiService } from "@/shared/services/api.service";
import DateRangePicker, { DateRange } from "@/shared/components/DateRangePicker";
import { Sale, OrderStatus, OrderItem } from "@/features/cash/types/salesTypes";
import { CashOutflow } from "@/features/cash/types/cashTypes";
import dayjs from "dayjs";

const currency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

type MetricType = "all" | "income" | "outflows" | "profit";

/** Ganancia de una línea según purchasePrice enviado por el API. */
function lineProfitDetail(item: OrderItem): { profit: number; estimated: boolean } {
    if (item.purchasePrice == null) return { profit: 0, estimated: false };
    const profit =
        (Number(item.unitPrice) - Number(item.purchasePrice)) * Number(item.quantity);
    return { profit, estimated: item.profitEstimated === true };
}

function orderProfitDetail(order: Sale): { profit: number; hasEstimated: boolean } {
    return (order.orderItems ?? []).reduce(
        (acc, item) => {
            const { profit, estimated } = lineProfitDetail(item);
            acc.profit += profit;
            if (estimated) acc.hasEstimated = true;
            return acc;
        },
        { profit: 0, hasEstimated: false as boolean }
    );
}

// Resize observer hook supporting callback refs to handle conditional rendering
function useDebounceWidth(delay = 260) {
    const [width, setWidth] = useState<number | undefined>(undefined);
    const roRef = useRef<ResizeObserver | null>(null);
    const isFirst = useRef(true);

    const ref = useCallback(
        (node: HTMLDivElement | null) => {
            if (roRef.current) {
                roRef.current.disconnect();
                roRef.current = null;
            }

            if (node) {
                let timer: ReturnType<typeof setTimeout>;
                const ro = new ResizeObserver((entries) => {
                    const w = entries[0]?.contentRect.width;
                    if (!w) return;
                    if (isFirst.current) {
                        isFirst.current = false;
                        setWidth(Math.floor(w));
                    } else {
                        clearTimeout(timer);
                        timer = setTimeout(() => setWidth(Math.floor(w)), delay);
                    }
                });
                ro.observe(node);
                roRef.current = ro;
            }
        },
        [delay]
    );

    useEffect(() => {
        return () => {
            if (roRef.current) {
                roRef.current.disconnect();
            }
        };
    }, []);

    return { ref, width };
}

interface FinancialChartProps {
    orders: Sale[];
    outflows: CashOutflow[];
    dateRange: DateRange;
    loading: boolean;
    error: string | null;
}

export default function FinancialChart({
    orders,
    outflows,
    dateRange,
    loading,
    error,
}: FinancialChartProps) {
    const { ref: chartContainerRef, width: chartWidth } = useDebounceWidth(260);
    const listRef = useRef<HTMLUListElement | null>(null);
    const [showTopFade, setShowTopFade] = useState(false);
    const [showBottomFade, setShowBottomFade] = useState(false);
    const [isScrolledToTop, setIsScrolledToTop] = useState(true);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

    // Filter states
    const [metricType, setMetricType] = useState<MetricType>("all");

    // Filter orders by date range
    const filteredOrders = useMemo(() => {
        const start = dayjs(dateRange.startDate);
        const end = dayjs(dateRange.endDate);

        return orders
            .filter((o) => {
                const oDate = dayjs(o.createdAt);
                const isAfterOrEqual = oDate.isAfter(start) || oDate.isSame(start);
                const isBeforeOrEqual = oDate.isBefore(end) || oDate.isSame(end);
                return isAfterOrEqual && isBeforeOrEqual && o.status !== "CANCELLED";
            })
            .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));
    }, [orders, dateRange]);

    // Update scroll fade indicators when list content or size changes
    useEffect(() => {
        const el = listRef.current;
        if (!el) {
            setShowTopFade(false);
            setShowBottomFade(false);
            return;
        }

        const update = () => {
            const hasOverflow = el.scrollHeight > el.clientHeight;
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            setShowTopFade(hasOverflow && !atTop);
            setShowBottomFade(hasOverflow && !atBottom);
            setIsScrolledToTop(atTop);
            setIsScrolledToBottom(atBottom);
        };

        update();
        el.addEventListener("scroll", update);
        window.addEventListener("resize", update);
        return () => {
            el.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [filteredOrders, chartWidth]);

    // Calculate totals for Left Panel
    const stats = useMemo(() => {
        let income = 0;
        const sales = filteredOrders.length;
        let profit = 0;
        let estimatedOrdersCount = 0;
        let realOrdersCount = 0;

        filteredOrders.forEach((o) => {
            income += Number(o.total);
            const detail = orderProfitDetail(o);
            profit += detail.profit;
            if (detail.hasEstimated) {
                estimatedOrdersCount++;
            } else {
                realOrdersCount++;
            }
        });

        // Determine profit state: real, mixto (mixed), or estimado
        let profitState: "real" | "mixto" | "estimado";
        if (estimatedOrdersCount === 0) {
            profitState = "real";
        } else if (realOrdersCount === 0) {
            profitState = "estimado";
        } else {
            profitState = "mixto";
        }

        const margin = income > 0 ? (profit / income) * 100 : 0;

        return { income, sales, profit, margin, profitState };
    }, [filteredOrders]);

    // Calculate daily series for the line chart
    const chartData = useMemo(() => {
        const start = dayjs(dateRange.startDate).startOf("day");
        const end = dayjs(dateRange.endDate).endOf("day");

        const dateMap: Record<string, { income: number; outflows: number; profit: number }> = {};

        // Pre-fill daily slots
        let current = start;
        while (current.isBefore(end) || current.isSame(end, "day")) {
            const dateStr = current.format("YYYY-MM-DD");
            dateMap[dateStr] = { income: 0, outflows: 0, profit: 0 };
            current = current.add(1, "day");
        }

        // Fill data from filtered orders and outflows
        filteredOrders.forEach((o) => {
            const dateStr = dayjs(o.createdAt).format("YYYY-MM-DD");
            if (dateMap[dateStr]) {
                dateMap[dateStr].income += Number(o.total);
                dateMap[dateStr].profit += orderProfitDetail(o).profit;
            }
        });

        outflows.forEach((outflow) => {
            const dateStr = dayjs(outflow.createdAt).format("YYYY-MM-DD");
            if (dateMap[dateStr]) {
                dateMap[dateStr].outflows += Number(outflow.amount);
            }
        });

        // Convert map to array for chart
        return Object.entries(dateMap).map(([dateStr, metrics]) => ({
            dateLabel: dayjs(dateStr).format("DD/MM"),
            ...metrics,
        }));
    }, [filteredOrders, outflows, dateRange]);

    const axisTickFontSize = 12;

    // Series config based on selection (solo métricas monetarias)
    const chartSeries = useMemo(() => {
        const seriesList = [];
        if (metricType === "all" || metricType === "income") {
            seriesList.push({
                dataKey: "income",
                label: "Ingresos (S/.)",
                color: "#22c55e",
                valueFormatter: (v: number | null) => currency(v ?? 0),
            });
        }
        if (metricType === "all" || metricType === "outflows") {
            seriesList.push({
                dataKey: "outflows",
                label: "Egresos (S/.)",
                color: "#ef4444",
                valueFormatter: (v: number | null) => currency(v ?? 0),
            });
        }
        if (metricType === "all" || metricType === "profit") {
            seriesList.push({
                dataKey: "profit",
                label: "Ganancia Neta (S/.)",
                color: "#8b5cf6",
                valueFormatter: (v: number | null) => currency(v ?? 0),
            });
        }
        return seriesList;
    }, [metricType]);

    const chartYAxis = useMemo(
        () => [
            {
                valueFormatter: (v: number) => `S/.${Number(v).toFixed(0)}`,
                tickLabelStyle: { fontSize: axisTickFontSize },
            },
        ],
        [axisTickFontSize]
    );

    // Status chip colors
    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case "PAID":
                return "success";
            case "PENDING":
                return "warning";
            case "SHIPPED":
                return "info";
            case "DELIVERED":
                return "secondary";
            default:
                return "default";
        }
    };

    return (
        <Card variant="outlined" sx={{ width: "100%", borderRadius: 3 }}>
            <CardHeader
                avatar={<TrendingUpRoundedIcon color="primary" />}
                title={<Typography variant="subtitle1" fontWeight={750}>Seguimiento Financiero de la Tienda</Typography>}
                subheader="Análisis de ingresos, egresos y rentabilidad por período de tiempo"
                sx={{ pb: 1.5 }}
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ p: 4, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 3 }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                ) : (
                    <Grid container>
                        {/* ── Column 1: Left Filters and Summary stats ── */}
                        <Grid
                            size={{ xs: 12, md: 4, lg: 3 }}
                            sx={{
                                borderRight: { xs: "none", md: "1px solid" },
                                borderBottom: { xs: "1px solid", md: "none" },
                                borderColor: "divider",
                                p: 3,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                                bgcolor: (t) => t.palette.mode === "dark" ? alpha(t.palette.background.default, 0.2) : alpha(t.palette.grey[50], 0.4),
                            }}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1, textTransform: "uppercase" }}>
                                    Métrica de Visualización
                                </Typography>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={metricType}
                                        onChange={(e) => setMetricType(e.target.value as MetricType)}
                                        sx={{ borderRadius: 2, bgcolor: "background.paper" }}
                                    >
                                        <MenuItem value="all">Ingresos, Egresos y Ganancias</MenuItem>
                                        <MenuItem value="income">Ingresos (S/.)</MenuItem>
                                        <MenuItem value="outflows">Egresos (S/.)</MenuItem>
                                        <MenuItem value="profit">Ganancia Neta (S/.)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>



                            <Divider sx={{ my: 0.5 }} />

                            {/* Summary Metrics List */}
                            <Stack spacing={2}>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha("#22c55e", 0.15), color: "#22c55e", display: "flex" }}>
                                        <AttachMoneyRoundedIcon fontSize="small" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Ingresos Totales</Typography>
                                        <Typography variant="body1" fontWeight={750}>{currency(stats.income)}</Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha("#3b82f6", 0.15), color: "#3b82f6", display: "flex" }}>
                                        <ShoppingBagRoundedIcon fontSize="small" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Órdenes Realizadas</Typography>
                                        <Typography variant="body1" fontWeight={750}>{stats.sales} ord.</Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha("#8b5cf6", 0.15), color: "#8b5cf6", display: "flex" }}>
                                        <TrendingUpRoundedIcon fontSize="small" />
                                    </Box>
                                    <Box>
                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                            <Typography variant="caption" color="text.secondary">Ganancia Neta</Typography>
                                            {stats.profitState !== "real" && (
                                                <Tooltip title={stats.profitState === "mixto" ? "Parte de la ganancia usa costo estimado (mezcla de ventas con costo real y backfill)." : "Toda la ganancia usa costo estimado (ventas históricas rellenadas con precio actual del catálogo)." }>
                                                    <Chip
                                                        icon={<InfoOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                                                        label={stats.profitState === "mixto" ? "Mixto" : "Estimado"}
                                                        size="small"
                                                        color={stats.profitState === "mixto" ? "warning" : "error"}
                                                        variant="outlined"
                                                        sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700 }}
                                                    />
                                                </Tooltip>
                                            )}
                                        </Stack>
                                        <Typography variant="body1" fontWeight={750} color="primary.main">{currency(stats.profit)}</Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: alpha("#eab308", 0.15), color: "#eab308", display: "flex" }}>
                                        <PercentRoundedIcon fontSize="small" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Margen de Ganancia</Typography>
                                        <Typography variant="body1" fontWeight={750}>{stats.margin.toFixed(1)}%</Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Grid>

                        {/* ── Column 2: Center Line Chart ── */}
                        <Grid
                            size={{ xs: 12, md: 4, lg: 6 }}
                            sx={{
                                p: 3,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                minHeight: 320,
                            }}
                        >
                            <Box ref={chartContainerRef} sx={{ width: "100%", height: "100%", minHeight: 280 }}>
                                {chartData.length === 0 ? (
                                    <Box sx={{ display: "flex", height: 280, alignItems: "center", justifyContent: "center" }}>
                                        <Typography color="text.secondary" variant="body2">Sin datos disponibles en las fechas indicadas</Typography>
                                    </Box>
                                ) : chartWidth ? (
                                    <LineChart
                                        width={chartWidth}
                                        height={400}
                                        dataset={chartData}
                                        xAxis={[{
                                            scaleType: "point",
                                            dataKey: "dateLabel",
                                            tickLabelStyle: { fontSize: axisTickFontSize },
                                        }]}
                                        yAxis={chartYAxis}
                                        series={chartSeries}
                                        margin={{ left: 15, right: 25, top: 50, bottom: 0 }}
                                        slotProps={{
                                            legend: {
                                                direction: "horizontal",
                                                position: { vertical: "top", horizontal: "center" },
                                            }
                                        }}
                                    />
                                ) : (
                                    <Box sx={{ height: 280 }} />
                                )}
                            </Box>
                        </Grid>

                        {/* ── Column 3: Right Orders/Transactions List ── */}
                        <Grid
                            size={{ xs: 12, md: 4, lg: 3 }}
                            sx={{
                                borderLeft: { xs: "none", md: "1px solid" },
                                borderTop: { xs: "1px solid", md: "none" },
                                borderColor: "divider",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <Box sx={{ p: 2, bgcolor: (t) => alpha(t.palette.action.hover, 0.2), borderBottom: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Transacciones ({filteredOrders.length})
                                </Typography>
                            </Box>
                            {/* Transactions list with scroll indicators */}
                            <Box sx={{ position: "relative" }}>
                                <List
                                    ref={listRef}
                                    sx={{
                                        p: 0,
                                        overflowY: "auto",
                                        maxHeight: { xs: 340, md: 420 },
                                        height: "100%",
                                        "&::-webkit-scrollbar": {
                                            width: "6px",
                                        },
                                        "&::-webkit-scrollbar-thumb": {
                                            bgcolor: "divider",
                                            borderRadius: "3px",
                                        }
                                    }}
                                >
                                {filteredOrders.length === 0 ? (
                                    <ListItem>
                                        <ListItemText
                                            primary="No hay registros"
                                            primaryTypographyProps={{
                                                variant: "body2",
                                                color: "text.secondary",
                                                align: "center",
                                                sx: { py: 2, width: "100%" }
                                            }}
                                        />
                                    </ListItem>
                                ) : (
                                    filteredOrders.map((o) => (
                                        <React.Fragment key={o.id}>
                                            <ListItem
                                                alignItems="flex-start"
                                                sx={{
                                                    px: 2,
                                                    py: 1.5,
                                                    transition: "background-color 0.15s",
                                                    "&:hover": {
                                                        bgcolor: "action.hover"
                                                    }
                                                }}
                                            >
                                                <ListItemText
                                                    primaryTypographyProps={{ component: "div" }}
                                                    secondaryTypographyProps={{ component: "div" }}
                                                    primary={
                                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                                            <Typography variant="body2" fontWeight={750}>
                                                                Orden #{o.id}
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight={750} color="primary.main">
                                                                {currency(o.total)}
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                    secondary={
                                                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {o.userName || "Público General"}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.disabled">
                                                                    {dayjs(o.createdAt).format("DD/MM, HH:mm")}
                                                                </Typography>
                                                            </Stack>
                                                            <Box sx={{ pt: 0.25 }}>
                                                                <Chip
                                                                    label={o.status}
                                                                    size="small"
                                                                    color={getStatusColor(o.status)}
                                                                    variant="outlined"
                                                                    sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700 }}
                                                                />
                                                            </Box>
                                                        </Stack>
                                                    }
                                                />
                                            </ListItem>
                                            <Divider />
                                        </React.Fragment>
                                    ))
                                )}
                                </List>
                                {/* Fade overlays to hint scrollable content */}
                                {showTopFade && (
                                    <Box
                                        className="transactions-scroll-top"
                                        sx={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 18,
                                            pointerEvents: "none",
                                            display: { xs: "none", md: "block" },
                                            background: (t) => `linear-gradient(${alpha(t.palette.background.paper, 0.9)}, transparent)`,
                                        }}
                                    />
                                )}
                                {showBottomFade && (
                                    <Box
                                        className="transactions-scroll-bottom"
                                        sx={{
                                            position: "absolute",
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: 18,
                                            pointerEvents: "none",
                                            background: (t) => `linear-gradient(transparent, ${alpha(t.palette.background.paper, 0.9)})`,
                                        }}
                                    />
                                )}

                                {/* ── Scroll UP button: visible when NOT at top ── */}
                                {!isScrolledToTop && (
                                    <IconButton
                                        onClick={() => {
                                            const el = listRef.current;
                                            if (!el) return;
                                            el.scrollTo({ top: Math.max(el.scrollTop - (el.clientHeight - 40), 0), behavior: "smooth" });
                                        }}
                                        title="Ir arriba"
                                        size="small"
                                        sx={{
                                            position: "absolute",
                                            top: 6,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            zIndex: 4,
                                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)",
                                            backdropFilter: "blur(4px)",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                            opacity: 0.7,
                                            transition: "opacity 0.2s, box-shadow 0.2s",
                                            "&:hover": {
                                                opacity: 1,
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.11)",
                                            },
                                        }}
                                    >
                                        <KeyboardArrowUpRoundedIcon fontSize="small" />
                                    </IconButton>
                                )}

                                {/* ── Scroll DOWN button: visible when NOT at bottom ── */}
                                {!isScrolledToBottom && (
                                    <IconButton
                                        onClick={() => {
                                            const el = listRef.current;
                                            if (!el) return;
                                            el.scrollTo({ top: Math.min(el.scrollTop + (el.clientHeight - 40), el.scrollHeight), behavior: "smooth" });
                                        }}
                                        title="Ver más"
                                        size="small"
                                        sx={{
                                            position: "absolute",
                                            bottom: 6,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            zIndex: 4,
                                            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)",
                                            backdropFilter: "blur(4px)",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                                            opacity: 0.7,
                                            transition: "opacity 0.2s, box-shadow 0.2s",
                                            "&:hover": {
                                                opacity: 1,
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.11)",
                                            },
                                        }}
                                    >
                                        <KeyboardArrowDownRoundedIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                )}
            </CardContent>
        </Card>
    );
}
