'use client';

import { Box, Button, Typography } from "@mui/material";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import { useRouter } from "next/navigation";

export default function ComingSoonPage() {
    const router = useRouter();

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                px: 3,
                textAlign: "center",
            }}
        >
            <ConstructionRoundedIcon sx={{ fontSize: 72, color: "text.disabled" }} />

            <Typography variant="h4" fontWeight={700}>
                En desarrollo
            </Typography>

            <Typography variant="body1" color="text.secondary" maxWidth={360}>
                Esta funcionalidad aún no está disponible. Estamos trabajando en ella.
            </Typography>

            <Button variant="outlined" onClick={() => router.back()} sx={{ mt: 1 }}>
                Volver
            </Button>
        </Box>
    );
}
