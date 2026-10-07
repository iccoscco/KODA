'use client';

import { useState, SubmitEvent } from "react";
import {
    Alert,
    Box,
    Button,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { AuthService } from "@/shared/services/auth.service";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";

export default function LoginForm() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await AuthService.login({ email, password });
            router.push("/dashboard");
        } catch (err) {
            const response = (err as AxiosError<{ message?: string }>)?.response;
            const status   = response?.status;
            const message  = response?.data?.message ?? "";

            if (status === 401 && message === "User account is disabled") {
                setError("Tu cuenta está deshabilitada. Contacta al administrador.");
            } else if (status === 401 || status === 422) {
                setError("Correo o contraseña incorrectos.");
            } else {
                setError("Ocurrió un error. Intenta de nuevo más tarde.");
            }
            setLoading(false);
        }
    };

    return (
        <Box
            component="form"
            noValidate
            onSubmit={handleSubmit}
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                width: "100%",
            }}
        >
            <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography variant="h5" fontWeight={700} letterSpacing={1}>
                    Iniciar sesión
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Bienvenido de nuevo
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <TextField
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                variant="outlined"
                autoComplete="new-email"
                disabled={loading}
            />

            <TextField
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                variant="outlined"
                autoComplete="new-password"
                disabled={loading}
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    edge="end"
                                    size="small"
                                >
                                    {showPassword
                                        ? <VisibilityOffRoundedIcon fontSize="small" />
                                        : <VisibilityRoundedIcon fontSize="small" />
                                    }
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
            />


            <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                loading={loading}
                disabled={loading}
                sx={{ py: 1.5, fontWeight: 600, letterSpacing: 0.5 }}
            >
                Ingresar
            </Button>

        </Box>
    );
}
