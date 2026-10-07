"use client";

import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";
import CashSessionsReport from "./components/CashSessionsReport";
import ProductsReport from "./components/ProductsReport";

export default function Reports() {
    const [tab, setTab] = useState(0);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AssessmentRoundedIcon color="primary" />
                    <Typography variant="h5" fontWeight={700}>Reportes</Typography>
                </Box>

                <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{ borderBottom: 1, borderColor: "divider", px: { xs: 1, sm: 2 } }}
                    >
                        <Tab label="Historial de Caja" />
                        <Tab label="Productos y Stock" />
                    </Tabs>

                    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                        {tab === 0 && <CashSessionsReport />}
                        {tab === 1 && <ProductsReport />}
                    </Box>
                </Paper>
            </Box>
        </LocalizationProvider>
    );
}
