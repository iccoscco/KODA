'use client';

import { Dialog, IconButton, Box } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

interface Props {
    open: boolean;
    src: string;
    alt?: string;
    onClose: () => void;
}

export default function AvatarPreviewDialog({ open, src, alt = "Avatar", onClose }: Props) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: "transparent",
                        boxShadow: "none",
                        overflow: "visible",
                    },
                },
                backdrop: { sx: { backdropFilter: "blur(6px)", bgcolor: "rgba(0,0,0,0.75)" } },
            }}
        >
            {/* Botón cerrar — esquina superior derecha de la pantalla */}
            <IconButton
                onClick={onClose}
                sx={{
                    position: "fixed",
                    top: 16,
                    right: 16,
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    backdropFilter: "blur(4px)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
            >
                <CloseRoundedIcon />
            </IconButton>

            {/* Imagen */}
            <Box
                component="img"
                src={src}
                alt={alt}
                sx={{
                    display: "block",
                    maxWidth: "80vw",
                    maxHeight: "80vh",
                    borderRadius: 3,
                    boxShadow: 8,
                }}
            />
        </Dialog>
    );
}
