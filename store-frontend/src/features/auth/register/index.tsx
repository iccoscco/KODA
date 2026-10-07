import { Box } from "@mui/material";
import ThemeToggle from "@/shared/components/themeToggle";
import AuthPublicEntryCleanup from "@/features/auth/components/AuthPublicEntryCleanup";
import RegisterForm from "@/features/auth/register/components/registerForm";

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
                <RegisterForm />
            </Box>
        </Box>
    );
}
