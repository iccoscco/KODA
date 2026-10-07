'use client';

import type { ReactNode } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Tooltip,
    Typography,
} from "@mui/material";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import { alpha, useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";

/** Tamaño de miniatura en formularios de variantes (crear / editar). */
export const VARIANT_IMAGE_THUMB_SIZE = 140;
/** Slot principal: primera imagen (sustituye al área de soltar vacía). */
export const VARIANT_PRIMARY_IMAGE_SIZE = 176;

export function ImageLightbox({
    open,
    src,
    alt,
    onClose,
}: {
    open: boolean;
    src: string;
    alt: string;
    onClose: () => void;
}) {
    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        queueMicrotask(() => {
            onClose();
        });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            closeAfterTransition={false}
            disableRestoreFocus
        >
            <DialogTitle sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 0.5, px: 1, minHeight: 0 }}>
                <IconButton size="small" onClick={handleClose} aria-label="Cerrar vista ampliada">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent
                sx={{
                    p: 2,
                    pt: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    bgcolor: (t) => alpha(t.palette.common.black, t.palette.mode === "dark" ? 0.35 : 0.06),
                }}
            >
                {src ? (
                    <Box
                        component="img"
                        src={src}
                        alt={alt}
                        sx={{
                            maxWidth: "100%",
                            maxHeight: "min(82vh, 880px)",
                            width: "auto",
                            height: "auto",
                            objectFit: "contain",
                            borderRadius: 1,
                        }}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

export function VariantImageThumb({
    src,
    alt,
    onRemove,
    onExpand,
    size = VARIANT_IMAGE_THUMB_SIZE,
    /** Contenido extra abajo a la izquierda (además de la estrella si isMain). */
    footerStart,
    /** Imagen marcada como principal en servidor o primera en cola al crear. */
    isMain,
    /** Marcar esta miniatura como principal (reordenar local o PATCH en servidor). */
    onSetAsMain,
    setAsMainDisabled,
    emphasized,
    removeTooltip,
}: {
    src: string;
    alt: string;
    onRemove?: () => void;
    onExpand: () => void;
    size?: number;
    footerStart?: ReactNode;
    isMain?: boolean;
    onSetAsMain?: () => void;
    setAsMainDisabled?: boolean;
    emphasized?: boolean;
    removeTooltip?: string;
}) {
    const zoomRight = Boolean(isMain || footerStart);
    return (
        <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <Box
                component="img"
                src={src}
                alt={alt}
                sx={{
                    width: size,
                    height: size,
                    objectFit: "cover",
                    borderRadius: 1.5,
                    border: emphasized ? "2px solid" : "1px solid",
                    borderColor: emphasized ? "primary.main" : "divider",
                    display: "block",
                    bgcolor: "action.hover",
                }}
            />
            {onSetAsMain && !isMain ? (
                <Tooltip title="Usar como imagen principal">
                    <IconButton
                        size="small"
                        disabled={setAsMainDisabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSetAsMain();
                        }}
                        sx={{
                            position: "absolute",
                            top: -6,
                            left: -6,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            p: 0.35,
                            "&:hover": { bgcolor: "primary.dark" },
                            "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
                        }}
                    >
                        <StarBorderRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            ) : null}
            {(isMain || footerStart) ? (
                <Box sx={{ position: "absolute", bottom: 6, left: 6, display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isMain ? (
                        <Tooltip title="Imagen principal">
                            <StarRoundedIcon
                                sx={{
                                    fontSize: size >= 160 ? 22 : 20,
                                    color: "warning.main",
                                    filter: "drop-shadow(0 0 3px rgba(0,0,0,0.6))",
                                }}
                            />
                        </Tooltip>
                    ) : null}
                    {footerStart}
                </Box>
            ) : null}
            <Tooltip title="Ampliar">
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onExpand();
                    }}
                    sx={{
                        position: "absolute",
                        bottom: 6,
                        ...(zoomRight ? { right: 6, left: "auto" } : { left: 6 }),
                        width: 32,
                        height: 32,
                        bgcolor: "rgba(0,0,0,0.55)",
                        color: "common.white",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                    }}
                >
                    <ZoomInRoundedIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Tooltip>
            {onRemove && (
                <Tooltip title={removeTooltip ?? "Quitar"}>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        sx={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            bgcolor: "error.main",
                            color: "common.white",
                            p: 0.4,
                            "&:hover": { bgcolor: "error.dark" },
                        }}
                    >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
}

/** Zona compacta: una fila con icono + texto; arrastrar o clic. */
export function CompactVariantDropZone({
    inputId,
    onChange,
    onOpenFilePicker,
    onDropFiles,
    disabled,
    secondaryText,
}: {
    /** Modo crear: input file por fila. */
    inputId?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Modo editar: un solo input compartido; abrir selector vía callback. */
    onOpenFilePicker?: () => void;
    onDropFiles: (files: File[]) => void;
    disabled?: boolean;
    secondaryText?: string;
}) {
    const theme = useTheme();
    const busy = Boolean(disabled);

    const openPicker = () => {
        if (busy) return;
        if (inputId && onChange) {
            document.getElementById(inputId)?.click();
        } else {
            onOpenFilePicker?.();
        }
    };

    return (
        <Box
            role="button"
            tabIndex={busy ? -1 : 0}
            onKeyDown={(e) => {
                if (busy) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPicker();
                }
            }}
            onClick={() => openPicker()}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (busy) return;
                onDropFiles(Array.from(e.dataTransfer.files));
            }}
            sx={{
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: 1.5,
                py: 1.25,
                px: 2,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 1.5,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.5 : 1,
                pointerEvents: busy ? "none" : "auto",
                transition: "border-color 0.2s, background-color 0.2s",
                "&:hover": !busy
                    ? {
                          borderColor: "primary.main",
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.06),
                      }
                    : {},
            }}
        >
            <CloudUploadRoundedIcon sx={{ fontSize: 26, color: "text.secondary", flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Arrastra fotos aquí o haz clic para añadir
                </Typography>
                <Typography variant="caption" color="text.disabled" display="block">
                    {secondaryText ?? "Puedes seleccionar varias imágenes"}
                </Typography>
            </Box>
            {inputId && onChange ? (
                <input id={inputId} type="file" accept="image/*" multiple hidden onChange={onChange} />
            ) : null}
        </Box>
    );
}

/**
 * Recuadro cuadrado inicial: solo primera imagen (clic o arrastrar).
 * No incluye el input file; en crear usa `inputId`; en editar, `onOpenPicker`.
 */
export function VariantPrimaryImageDropSlot({
    inputId,
    onOpenPicker,
    onDropFiles,
    disabled,
}: {
    inputId?: string;
    onOpenPicker?: () => void;
    onDropFiles: (files: File[]) => void;
    disabled?: boolean;
}) {
    const theme = useTheme();
    const busy = Boolean(disabled);
    const s = VARIANT_PRIMARY_IMAGE_SIZE;

    const open = () => {
        if (busy) return;
        if (inputId) document.getElementById(inputId)?.click();
        else onOpenPicker?.();
    };

    return (
        <Box
            role="button"
            tabIndex={busy ? -1 : 0}
            onKeyDown={(e) => {
                if (busy) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
            onClick={open}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (busy) return;
                onDropFiles(Array.from(e.dataTransfer.files));
            }}
            sx={{
                width: s,
                height: s,
                flexShrink: 0,
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                px: 1,
                textAlign: "center",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.5 : 1,
                pointerEvents: busy ? "none" : "auto",
                transition: "border-color 0.2s, background-color 0.2s",
                "&:hover": !busy
                    ? {
                          borderColor: "primary.main",
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.06),
                      }
                    : {},
            }}
        >
            <CloudUploadRoundedIcon sx={{ fontSize: 36, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ lineHeight: 1.25, px: 0.5 }}>
                Arrastra o haz clic
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.2, px: 0.5 }}>
                Primera imagen
            </Typography>
        </Box>
    );
}

/** Botón para añadir más fotos (mismo input `inputId` o callback). */
export function VariantAddMoreImagesButton({
    inputId,
    onOpenPicker,
    disabled,
}: {
    inputId?: string;
    onOpenPicker?: () => void;
    disabled?: boolean;
}) {
    const pick = () => {
        if (inputId) document.getElementById(inputId)?.click();
        else onOpenPicker?.();
    };
    return (
        <Button
            type="button"
            variant="outlined"
            size="small"
            startIcon={<AddPhotoAlternateRoundedIcon />}
            disabled={disabled}
            onClick={pick}
            sx={{
                alignSelf: "center",
                minHeight: VARIANT_PRIMARY_IMAGE_SIZE,
                px: 2,
                borderStyle: "dashed",
                borderColor: "divider",
                color: "text.secondary",
                "&:hover": {
                    borderStyle: "dashed",
                    borderColor: "primary.main",
                    color: "primary.main",
                },
            }}
        >
            Agregar imágenes
        </Button>
    );
}
