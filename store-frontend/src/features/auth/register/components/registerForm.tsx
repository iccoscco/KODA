'use client';

import { useState } from "react";
import {
    Box,
    Button,
    Divider,
    IconButton,
    InputAdornment,
    Link,
    TextField,
    Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

export default function RegisterForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <Box
            component="form"
            noValidate
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                width: "100%",
            }}
        >
            <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography variant="h5" fontWeight={700} letterSpacing={1}>
                    Crear cuenta
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Completa tus datos para registrarte
                </Typography>
            </Box>

            <TextField
                label="Nombre completo"
                type="text"
                fullWidth
                variant="outlined"
                autoComplete="name"
            />

            <TextField
                label="Correo electrónico"
                type="email"
                fullWidth
                variant="outlined"
                autoComplete="email"
            />

            <TextField
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                fullWidth
                variant="outlined"
                autoComplete="new-password"
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

            <TextField
                label="Confirmar contraseña"
                type={showConfirm ? "text" : "password"}
                fullWidth
                variant="outlined"
                autoComplete="new-password"
                slotProps={{
                    input: {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowConfirm((prev) => !prev)}
                                    edge="end"
                                    size="small"
                                >
                                    {showConfirm
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
                sx={{ py: 1.5, fontWeight: 600, letterSpacing: 0.5, mt: 0.5 }}
            >
                Registrarse
            </Button>

            <Divider>
                <Typography variant="caption" color="text.secondary">
                    ¿Ya tienes una cuenta?
                </Typography>
            </Divider>

            <Button variant="outlined" size="large" fullWidth href="/login">
                Iniciar sesión
            </Button>
        </Box>
    );
}
