'use client';

import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Button,
    IconButton,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { ProductService } from "../services/products.service";
import { Product } from "../types/productsTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import { ImageLightbox, VariantImageThumb } from "./variantImageUi";

interface Props {
    open: boolean;
    productId: number | null;
    onClose: () => void;
}

const currency = (value: number) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(value);

/** Filas tipo detalle categoría: etiqueta izquierda, valor derecha (solo datos en texto). */
function DetailTextRow({ label, value }: { label: string; value: string }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, py: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ textAlign: "right", wordBreak: "break-word", minWidth: 0 }}>
                {value}
            </Typography>
        </Box>
    );
}

export default function ViewProduct({ open, productId, onClose }: Props) {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);

    useEffect(() => {
        if (!open || !productId) return;
        let active = true;
        setLoading(true);
        setError(null);
        ProductService.getProduct(productId)
            .then((res) => {
                if (active) setProduct(res);
            })
            .catch(() => {
                if (active) setError("No se pudo cargar el detalle del producto.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [open, productId]);

    useEffect(() => {
        if (!open) setImageLightbox(null);
    }, [open]);

    const activeVariants = useMemo(
        () => (product?.variants ?? []).filter((v) => v.isActive),
        [product]
    );

    /** Cierra sin dejar foco en un hijo del modal mientras MUI aplica aria-hidden al fondo. */
    const handleClose = () => {
        (document.activeElement as HTMLElement)?.blur();
        queueMicrotask(() => {
            onClose();
        });
    };

    return (
        <>
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            disableRestoreFocus
            slotProps={{
                paper: {
                    sx: {
                        m: { xs: 2, sm: 3 },
                        maxHeight: { xs: "calc(100vh - 32px)", sm: "calc(100vh - 48px)" },
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 2,
                    },
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    pr: 1,
                    px: { xs: 1.5, sm: 3 },
                    py: 2,
                    flexShrink: 0,
                }}
            >
                <Typography component="span" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                    Detalle de producto
                </Typography>
                <IconButton size="small" onClick={handleClose} aria-label="Cerrar">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    px: { xs: 1.5, sm: 3 },
                    overflowX: "hidden",
                    flex: 1,
                    minHeight: 0,
                }}
            >
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress size={26} />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : product ? (
                    <>
                        <DetailTextRow label="Nombre" value={product.name} />
                        <DetailTextRow label="Categoría" value={product.categoryName} />
                        <DetailTextRow label="Precio compra" value={currency(product.purchasePrice)} />
                        <DetailTextRow label="Precio venta" value={currency(product.salePrice)} />
                        <DetailTextRow label="Stock mínimo" value={String(product.minStock)} />
                        <DetailTextRow label="Estado" value={product.isActive ? "Activo" : "Inactivo"} />
                        <Divider />

                        <Typography variant="subtitle2" fontWeight={700}>
                            Variantes activas ({activeVariants.length})
                        </Typography>

                        {activeVariants.length === 0 ? (
                            <Alert severity="info">Este producto no tiene variantes activas.</Alert>
                        ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {activeVariants.map((variant) => (
                                    <Box
                                        key={variant.id}
                                        sx={{
                                            p: { xs: 1.25, sm: 1.5 },
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 1.5,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
                                            {variant.sku ? (
                                                <Chip label={`SKU: ${variant.sku}`} size="small" sx={{ maxWidth: "100%" }} />
                                            ) : null}
                                            <Chip label={`Stock: ${variant.stock}`} size="small" />
                                            <Chip
                                                label={`Color: ${variant.colorName ?? "Sin color"}`}
                                                size="small"
                                                sx={{ maxWidth: "100%" }}
                                            />
                                            <Chip
                                                label={`Talla: ${variant.sizeName ?? "Sin talla"}`}
                                                size="small"
                                                sx={{ maxWidth: "100%" }}
                                            />
                                        </Box>

                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                            {(variant.images ?? []).map((img) => {
                                                const src = toMediaUrl(img.url);
                                                const alt = `Variante ${variant.sku ?? variant.id} — imagen`;
                                                return (
                                                    <VariantImageThumb
                                                        key={img.id}
                                                        src={src}
                                                        alt={alt}
                                                        size={isSmallScreen ? 88 : 100}
                                                        isMain={img.isMain}
                                                        emphasized={img.isMain}
                                                        onExpand={() => setImageLightbox({ src, alt })}
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </>
                ) : (
                    <Alert severity="warning">Selecciona un producto para ver su detalle.</Alert>
                )}
            </DialogContent>
            <DialogActions
                sx={{
                    px: { xs: 1.5, sm: 3 },
                    py: 2,
                    flexShrink: 0,
                    "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
                }}
            >
                <Button variant="contained" onClick={handleClose}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>

        <ImageLightbox
            open={imageLightbox !== null}
            src={imageLightbox?.src ?? ""}
            alt={imageLightbox?.alt ?? ""}
            onClose={() => setImageLightbox(null)}
        />
        </>
    );
}

