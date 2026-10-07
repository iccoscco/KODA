"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Grid from "@mui/material/Grid";
import {
    Alert, Box, Card, CardContent, CardHeader, Chip,
    CircularProgress, Divider, Paper, Skeleton, Stack, Tooltip, Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { BarChart } from "@mui/x-charts/BarChart";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import { DashboardService } from "./services/dashboard.service";
import type {
    DashboardSummary,
    RegisterSalesItem,
    SellerSalesItem,
    StockInputItem,
} from "./types/dashboardTypes";
import FinancialChart from "./components/FinancialChart";
import DateRangePicker, { DateRange } from "@/shared/components/DateRangePicker";
import dayjs from "dayjs";
import { ApiService } from "@/shared/services/api.service";
import { Sale } from "@/features/cash/types/salesTypes";
import { CashOutflow } from "@/features/cash/types/cashTypes";

const currency = (v: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

/**
 * Mide el ancho del contenedor con ResizeObserver.
 * - Primera medición (montaje): inmediata, sin espera.
 * - Mediciones siguientes (resize del sidebar): debounce para no
 *   rerenderizar en cada píxel de la transición CSS.
 */
function useDebounceWidth(delay = 260) {
    const ref = useRef<HTMLDivElement>(null);
    const isFirst = useRef(true);
    const [width, setWidth] = useState<number | undefined>(undefined);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width;
            if (!w) return;
            if (isFirst.current) {
                isFirst.current = false;
                setWidth(Math.floor(w));        // inmediato al montar
            } else {
                clearTimeout(timer);
                timer = setTimeout(() => setWidth(Math.floor(w)), delay); // debounce al redimensionar
            }
        });
        ro.observe(el);
        return () => { ro.disconnect(); clearTimeout(timer); };
    }, [delay]);

    return { ref, width };
}


// ── Tarjeta de resumen ────────────────────────────────────────────────────────

function SummaryCard({
    label, value, sub, icon: Icon, color, loading,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
    loading: boolean;
}) {
    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {label}
                    </Typography>
                    {loading ? (
                        <Skeleton width={90} height={40} />
                    ) : (
                        <Typography variant="h5" fontWeight={700}>
                            {value}
                        </Typography>
                    )}
                    {sub && !loading && (
                        <Typography variant="caption" color="text.secondary">
                            {sub}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        bgcolor: alpha(color, 0.15),
                        borderRadius: 2,
                        p: 1,
                        display: "flex",
                        flexShrink: 0,
                    }}
                >
                    <Icon sx={{ color, fontSize: 28 }} />
                </Box>
            </CardContent>
        </Card>
    );
}

// ── Gráfica de barras ─────────────────────────────────────────────────────────

function SalesBarChart({
    title,
    data,
    xKey,
    loading,
    color,
}: {
    title: string;
    data: { label: string; amount: number }[];
    xKey: string;
    loading: boolean;
    color: string;
}) {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down("sm"));
    const isCompact = useMediaQuery(theme.breakpoints.down("md"));

    const { ref: containerRef, width: chartWidth } = useDebounceWidth(260);

    const isEmpty = !loading && data.length === 0;

    /** En móvil el margen izquierdo fijo empujaba todo el gráfico a la derecha. */
    const chartMargin = isNarrow
        ? { left: 4, right: 4, top: 10, bottom: 44 }
        : isCompact
            ? { left: 56, right: 10, top: 14, bottom: 42 }
            : { left: 72, right: 16, top: 16, bottom: 40 };

    const tickFs = isNarrow ? 10 : 11;

    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardHeader
                title={<Typography variant="subtitle1" fontWeight={700}>{title}</Typography>}
                sx={{ pb: 0 }}
            />
            <Divider />
            <CardContent
                sx={{
                    p: { xs: 0.5, sm: 1 },
                    pb: "8px !important",
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    boxSizing: "border-box",
                }}
            >
                {/* El Box con ref siempre está en el DOM para que el
                    ResizeObserver se adjunte correctamente desde el primer render */}
                <Box ref={containerRef} sx={{ width: "100%", maxWidth: "100%", mx: 0 }}>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : isEmpty ? (
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 260 }}>
                            <Typography color="text.secondary" variant="body2">Sin datos disponibles</Typography>
                        </Box>
                    ) : chartWidth ? (
                        <BarChart
                            width={chartWidth}
                            dataset={data.map((d) => ({ label: d.label, amount: d.amount }))}
                            xAxis={[{
                                scaleType: "band",
                                dataKey: "label",
                                tickLabelStyle: { fontSize: tickFs },
                            }]}
                            yAxis={[{
                                valueFormatter: (v: number) => `S/.${v.toFixed(0)}`,
                                tickLabelStyle: { fontSize: tickFs },
                            }]}
                            series={[{
                                dataKey: "amount",
                                label: "Total (S/.)",
                                color,
                                valueFormatter: (v: number | null) => currency(v ?? 0),
                            }]}
                            height={isNarrow ? 260 : 270}
                            margin={chartMargin}
                            slotProps={{ legend: { sx: { display: "none" } } }}
                        />
                    ) : (
                        // Reserva el espacio mientras el ResizeObserver dispara
                        // para evitar el colapso y la posterior expansión brusca
                        <Box sx={{ height: isNarrow ? 260 : 270 }} />
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function Dashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [sellerSales, setSellerSales] = useState<SellerSalesItem[]>([]);
    const [registerSales, setRegisterSales] = useState<RegisterSalesItem[]>([]);
    const [stockInputs, setStockInputs] = useState<StockInputItem[]>([]);

    // Financial data states
    const [orders, setOrders] = useState<Sale[]>([]);
    const [outflows, setOutflows] = useState<CashOutflow[]>([]);

    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingCharts, setLoadingCharts] = useState(true);
    const [loadingStockInputs, setLoadingStockInputs] = useState(true);
    const [loadingFinData, setLoadingFinData] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [finError, setFinError] = useState<string | null>(null);

    // Date range filter state
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: dayjs().subtract(7, "days").startOf("day").toDate(),
        endDate: dayjs().endOf("day").toDate(),
        hasTime: false,
    });

    useEffect(() => {
        DashboardService.getSummary()
            .then(setSummary)
            .catch(() => setError("No se pudo cargar el resumen"))
            .finally(() => setLoadingSummary(false));

        Promise.all([
            DashboardService.getSalesBySeller(),
            DashboardService.getSalesByRegister(),
        ])
            .then(([sellers, registers]) => {
                setSellerSales(sellers);
                setRegisterSales(registers);
            })
            .catch(() => { }) // las gráficas muestran vacío si falla
            .finally(() => setLoadingCharts(false));

        DashboardService.getStockInputs()
            .then(setStockInputs)
            .catch(() => { })
            .finally(() => setLoadingStockInputs(false));

        let active = true;
        Promise.all([
            ApiService.get<Sale[]>('/orders'),
            ApiService.get<CashOutflow[]>('/cash/outflows'),
        ])
            .then(([ordersRes, outflowsRes]) => {
                if (!active) return;
                setOrders(ordersRes.data);
                setOutflows(outflowsRes.data);
            })
            .catch((err) => {
                console.error("[Dashboard - fetchData]", err);
                if (active) {
                    setFinError("Error al cargar las transacciones financieras");
                }
            })
            .finally(() => {
                if (active) {
                    setLoadingFinData(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    // Filter orders and stock inputs client-side by date range
    const filteredOrders = useMemo(() => {
        const start = dayjs(dateRange.startDate);
        const end = dayjs(dateRange.endDate);

        return orders.filter((o) => {
            const oDate = dayjs(o.createdAt);
            const isAfterOrEqual = oDate.isAfter(start) || oDate.isSame(start);
            const isBeforeOrEqual = oDate.isBefore(end) || oDate.isSame(end);
            return isAfterOrEqual && isBeforeOrEqual && o.status !== "CANCELLED";
        });
    }, [orders, dateRange]);

    const filteredStockInputs = useMemo(() => {
        const start = dayjs(dateRange.startDate);
        const end = dayjs(dateRange.endDate);

        return stockInputs.filter((item) => {
            const itemDate = dayjs(item.createdAt);
            const isAfterOrEqual = itemDate.isAfter(start) || itemDate.isSame(start);
            const isBeforeOrEqual = itemDate.isBefore(end) || itemDate.isSame(end);
            return isAfterOrEqual && isBeforeOrEqual;
        });
    }, [stockInputs, dateRange]);

    const totalIngresos = useMemo(() => {
        return filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    }, [filteredOrders]);

    const totalProductInputs = useMemo(() => {
        return filteredStockInputs.reduce((sum, item) => sum + item.quantity, 0);
    }, [filteredStockInputs]);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            {/* Cabecera con Título y Filtro de Fecha */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 2,
                    mb: 1,
                }}
            >
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Panel General
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Resumen de actividad de la tienda
                    </Typography>
                </Box>
                <Box sx={{ minWidth: { xs: "100%", sm: 280, md: 320 } }}>
                    <DateRangePicker value={dateRange} onChange={setDateRange} fullWidth />
                </Box>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {/* Tarjetas de resumen */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                    <SummaryCard
                        label="Ventas hoy"
                        value={summary ? currency(summary.todaySales) : "—"}
                        sub={summary ? `${summary.todayOrders} orden(es)` : undefined}
                        icon={AttachMoneyRoundedIcon}
                        color="#22c55e"
                        loading={loadingSummary}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                    <SummaryCard
                        label="Ventas este mes"
                        value={summary ? currency(summary.monthSales) : "—"}
                        icon={CalendarMonthRoundedIcon}
                        color="#3b82f6"
                        loading={loadingSummary}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                    <SummaryCard
                        label="Ingresos de Ventas"
                        value={loadingFinData ? "—" : currency(totalIngresos)}
                        sub={loadingFinData ? undefined : `${filteredOrders.length} orden(es)`}
                        icon={TrendingUpRoundedIcon}
                        color="#10b981"
                        loading={loadingFinData}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                    <SummaryCard
                        label="Ingreso de productos"
                        value={loadingStockInputs ? "—" : `${totalProductInputs} ud.`}
                        sub={loadingStockInputs ? undefined : `${filteredStockInputs.length} ingreso(s)`}
                        icon={Inventory2RoundedIcon}
                        color="#f59e0b"
                        loading={loadingStockInputs}
                    />
                </Grid>
            </Grid>

            {/* Gráfico Financiero de Ingresos, Ventas y Rentabilidad */}
            <FinancialChart
                orders={orders}
                outflows={outflows}
                dateRange={dateRange}
                loading={loadingFinData}
                error={finError}
            />

            {/* Gráficas secundarias */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <SalesBarChart
                        title="Ventas por vendedor"
                        data={sellerSales.map((s) => ({ label: s.sellerName, amount: s.totalAmount }))}
                        xKey="sellerName"
                        loading={loadingCharts}
                        color="#3b82f6"
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <SalesBarChart
                        title="Ventas por caja"
                        data={registerSales.map((r) => ({ label: r.registerName, amount: r.totalAmount }))}
                        xKey="registerName"
                        loading={loadingCharts}
                        color="#8b5cf6"
                    />
                </Grid>
            </Grid>



        </Box>
    );
}
