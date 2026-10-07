import type { SxProps, Theme } from "@mui/material/styles";

/** Paginación que no fuerza scroll horizontal en móvil (listas en tarjetas / tablas densas). */
export const compactTablePaginationSx: SxProps<Theme> = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    borderTop: 1,
    borderColor: "divider",
    "& .MuiTablePagination-toolbar": {
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "unset !important",
        py: { xs: 1, sm: 0.5 },
        px: { xs: 0.5, sm: 2 },
        gap: { xs: 0.75, sm: 0 },
        rowGap: { xs: 1, sm: 0 },
    },
    "& .MuiTablePagination-spacer": {
        flex: { xs: "0 0 100%", sm: "1 1 auto" },
        display: { xs: "none", sm: "block" },
    },
    "& .MuiTablePagination-selectLabel": {
        fontSize: { xs: "0.8125rem", sm: "0.875rem" },
        m: 0,
        mr: { xs: 0.5, sm: 2 },
    },
    "& .MuiTablePagination-select": {
        fontSize: { xs: "0.875rem", sm: "0.875rem" },
    },
    "& .MuiTablePagination-displayedRows": {
        fontSize: { xs: "0.8125rem", sm: "0.875rem" },
        mb: { xs: 0, sm: 0 },
    },
    "& .MuiTablePagination-actions": {
        ml: { xs: 0, sm: 2 },
    },
    "& .MuiInputBase-root": {
        mr: { xs: 0, sm: 2 },
    },
};
