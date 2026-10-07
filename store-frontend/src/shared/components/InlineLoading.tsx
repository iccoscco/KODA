"use client";

import { Box, CircularProgress, Typography } from "@mui/material";

/** Carga compacta: spinner + texto (sin skeleton de pantalla completa). */
export default function InlineLoading({ message = "Cargando..." }: { message?: string }) {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                py: { xs: 4, sm: 5 },
                px: 2,
            }}
        >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </Box>
    );
}
