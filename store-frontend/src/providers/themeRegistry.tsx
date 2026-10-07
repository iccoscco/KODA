'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { darkTheme, lightTheme } from '@/providers/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeModeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextType>({
    mode: 'dark',
    toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

const COOKIE_KEY = 'theme-mode';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

interface ThemeRegistryProps {
    children: ReactNode;
    initialMode?: ThemeMode;
}

export default function ThemeRegistry({ children, initialMode = 'dark' }: ThemeRegistryProps) {
    const [mode, setMode] = useState<ThemeMode>(initialMode);

    const toggleTheme = () => {
        setMode((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
            return next;
        });
    };

    const activeTheme = mode === 'dark' ? darkTheme : lightTheme;

    return (
        <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
            <ThemeProvider theme={activeTheme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}
