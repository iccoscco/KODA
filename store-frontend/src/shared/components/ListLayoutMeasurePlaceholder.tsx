import { CircularProgress, Paper, Typography } from "@mui/material";

/** Mientras se determina tabla vs tarjetas (evita flash); feedback breve sin bloque enorme. */
export function ListLayoutMeasurePlaceholder() {
    return (
        <Paper
            variant="outlined"
            role="status"
            aria-live="polite"
            sx={{
                borderRadius: 2,
                py: 4,
                px: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                maxWidth: "100%",
            }}
        >
            <CircularProgress size={28} thickness={4} aria-hidden />
            <Typography variant="body2" color="text.secondary" component="p" sx={{ m: 0 }}>
                Cargando vista…
            </Typography>
        </Paper>
    );
}
