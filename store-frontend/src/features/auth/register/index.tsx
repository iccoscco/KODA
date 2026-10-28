import { Alert, Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import ThemeToggle from "@/shared/components/themeToggle";
import AuthPublicEntryCleanup from "@/features/auth/components/AuthPublicEntryCleanup";

export default function Register() {
    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                bgcolor: "background.default",
            }}
        >
            <AuthPublicEntryCleanup />
            <ThemeToggle floating />

            <Box
                sx={{
                    width: { xs: "90%", sm: "420px" },
                    bgcolor: "background.card",
                    backdropFilter: "blur(12px)",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    p: { xs: 3, sm: 5 },
                    boxShadow: 8,
                }}
            >
                <Typography variant="h5" gutterBottom>Alta administrada</Typography>
                <Alert severity="info">Solicita tu acceso al administrador del local. El registro público está deshabilitado.</Alert>
                <Button component={Link} href="/login" sx={{ mt: 2 }}>Volver al inicio de sesión</Button>
            </Box>
        </Box>
    );
}
