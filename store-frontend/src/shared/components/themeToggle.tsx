'use client';

import { IconButton, Tooltip } from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { useThemeMode } from "@/providers/themeRegistry";

interface ThemeToggleProps {
    floating?: boolean;
}

export default function ThemeToggle({ floating = false }: ThemeToggleProps) {
    const { mode, toggleTheme } = useThemeMode();

    return (
        <Tooltip title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <IconButton
                onClick={toggleTheme}
                sx={floating ? {
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    bgcolor: 'background.paper',
                    boxShadow: 3,
                    '&:hover': {
                        bgcolor: 'background.paper',
                        opacity: 0.85,
                    },
                } : {}}
            >
                {mode === 'dark'
                    ? <LightModeRoundedIcon />
                    : <DarkModeRoundedIcon />
                }
            </IconButton>
        </Tooltip>
    );
}
