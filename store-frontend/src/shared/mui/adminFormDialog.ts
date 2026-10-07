import type { SxProps, Theme } from "@mui/material/styles";

/**
 * Shell compartido para modales de formulario en el panel admin:
 * márgenes en móvil (modal flotante), altura máxima, scroll interno, padding alineado con productos.
 */
export const adminFormDialogPaperSx: SxProps<Theme> = {
    m: { xs: 2, sm: 3 },
    maxHeight: { xs: "calc(100vh - 32px)", sm: "calc(100vh - 48px)" },
    display: "flex",
    flexDirection: "column",
    borderRadius: 2,
};

export const adminFormDialogTitleSx: SxProps<Theme> = {
    fontWeight: 700,
    px: { xs: 1.5, sm: 3 },
    py: 2,
    flexShrink: 0,
};

/** Cabecera con título + botón cerrar (misma línea que ViewProduct). */
export const adminFormDialogTitleRowSx: SxProps<Theme> = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 1,
    pr: 1,
    px: { xs: 1.5, sm: 3 },
    py: 2,
    flexShrink: 0,
};

export const adminFormDialogContentSx: SxProps<Theme> = {
    pt: 2.5,
    px: { xs: 1.5, sm: 3 },
    pb: 2,
    flex: 1,
    minHeight: 0,
    overflow: "auto",
};

export const adminFormDialogActionsSx: SxProps<Theme> = {
    px: { xs: 1.5, sm: 3 },
    py: 2,
    flexShrink: 0,
    gap: 1,
};
