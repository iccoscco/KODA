import { createTheme, type ThemeOptions } from "@mui/material/styles";

/** Cabecera de tabla + barra de paginación (mismo tono) */
const tableChrome: ThemeOptions["components"] = {
    MuiTableCell: {
        styleOverrides: {
            head: ({ theme }) => ({
                backgroundColor: theme.palette.background.tableHeader,
                fontWeight: 700,
            }),
        },
    },
    MuiTablePagination: {
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: theme.palette.background.tableHeader,
                borderTop: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
            }),
            toolbar: ({ theme }) => ({
                backgroundColor: theme.palette.background.tableHeader,
            }),
            selectIcon: {
                color: "inherit",
            },
            actions: {
                color: "inherit",
            },
        },
    },
};

/** Paleta alineada con Figma (JHEMAR) — oscuro */
const dark = {
    accent: "#D4AF37",
    /** Fondo de pantalla por defecto (app, login, etc.) */
    bg: "#111318",
    /** Sidebar, header, filas de tabla, cards / superficies elevadas */
    surface: "#1C1F26",
    /** Solo cabecera de columnas en tablas */
    tableHeader: "#242830",
    input: "#121212",
    text: "#FFFFFF",
    muted: "#9CA3AF",
    facebook: "#4267B2",
} as const;

/** Modo claro — misma familia cromática (dorado + neutros cálidos) */
const light = {
    accent: "#B8941E",
    bg: "#FAFAF9",
    surface: "#FFFFFF",
    tableHeader: "#F3F4F6",
    input: "#F3F4F6",
    text: "#0D0D0D",
    muted: "#6B7280",
    facebook: "#4267B2",
} as const;

declare module "@mui/material/styles" {
    interface TypeBackground {
        card: string;
        /** Fondo de campos tipo “filled” (login, formularios) */
        input: string;
        /** Cabecera de columnas en tablas (≠ paper en oscuro) */
        tableHeader: string;
    }
}

const typography = {
    fontFamily: "var(--font-roboto), sans-serif",
};

export const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: dark.accent,
            contrastText: "#0D0D0D",
        },
        secondary: {
            main: dark.muted,
        },
        text: {
            primary: dark.text,
            secondary: dark.muted,
            disabled: "rgba(156, 163, 175, 0.5)",
        },
        background: {
            default: dark.bg,
            paper: dark.surface,
            card: dark.surface,
            input: dark.input,
            tableHeader: dark.tableHeader,
        },
        divider: "rgba(255, 255, 255, 0.08)",
        action: {
            active: dark.muted,
            hover: "rgba(212, 175, 55, 0.08)",
            selected: "rgba(212, 175, 55, 0.16)",
        },
    },
    typography,
    components: tableChrome,
});

export const lightTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: light.accent,
            contrastText: light.text,
        },
        secondary: {
            main: light.muted,
        },
        text: {
            primary: light.text,
            secondary: light.muted,
            disabled: "rgba(107, 114, 128, 0.5)",
        },
        background: {
            default: light.bg,
            paper: light.surface,
            card: light.surface,
            input: light.input,
            tableHeader: light.tableHeader,
        },
        divider: "rgba(13, 13, 13, 0.08)",
        action: {
            active: light.muted,
            hover: "rgba(184, 148, 30, 0.08)",
            selected: "rgba(184, 148, 30, 0.12)",
        },
    },
    typography,
    components: tableChrome,
});
