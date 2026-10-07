"use client";

import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import { Product } from "@/features/products/types/productsTypes";
import { ProductsVariant } from "@/features/products/types/productsVariantTypes";
import { ProductsVariantImage } from "@/features/products/types/productsVariantImageTypes";
import { toMediaUrl } from "@/shared/utils/mediaUrl";
import { effectiveSalePrice } from "../../utils/effectivePrice";
import { VariantImageThumb } from "@/features/products/components/variantImageUi";

const imgUrl = (path: string) => toMediaUrl(path);

/** Principal primero, luego el resto por id estable */
export function sortVariantImages(images: ProductsVariantImage[]): ProductsVariantImage[] {
    return [...images].sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return a.id - b.id;
    });
}

export function variantLabel(v: ProductsVariant): string {
    const c = v.colorName ?? "Sin color";
    const s = v.sizeName ?? "Sin talla";
    return `${c} · ${s}`;
}

export interface SaleVariantPickerProps {
    product: Product;
    variants: ProductsVariant[];
    activeIndex: number;
    onIndexChange: (index: number) => void;
    formatCurrency: (n: number) => string;
    unitPriceOverride?: number;
}

/**
 * Selector de variante (flechas + datos). Sin imágenes — van en {@link SaleVariantImages}.
 */
export function SaleVariantPicker({
    product,
    variants,
    activeIndex,
    onIndexChange,
    formatCurrency,
    unitPriceOverride,
}: SaleVariantPickerProps) {
    if (!variants.length) {
        return (
            <Typography variant="body2" color="text.secondary">
                Este producto no tiene variantes disponibles.
            </Typography>
        );
    }

    const v = variants[activeIndex] ?? variants[0];
    const price = unitPriceOverride ?? effectiveSalePrice(product);
    const canNav = variants.length > 1;
    const safeIndex = Math.min(Math.max(0, activeIndex), variants.length - 1);

    const go = (delta: number) => {
        const next = (safeIndex + delta + variants.length) % variants.length;
        onIndexChange(next);
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "stretch",
                gap: 1,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
            }}
        >
            {canNav && (
                <IconButton size="small" onClick={() => go(-1)} aria-label="Variante anterior" sx={{ alignSelf: "center" }}>
                    <ChevronLeftRounded />
                </IconButton>
            )}

            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                    {variantLabel(v)}
                </Typography>
                {v.sku ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                        SKU: {v.sku}
                    </Typography>
                ) : null}
                <Typography variant="body2" color="primary" fontWeight={700} sx={{ mt: 0.5 }}>
                    {formatCurrency(price)}
                </Typography>
                <Typography variant="caption" color={v.stock <= 0 ? "error.main" : "text.secondary"}>
                    Stock: {v.stock}
                </Typography>
            </Box>

            {canNav && (
                <IconButton size="small" onClick={() => go(1)} aria-label="Siguiente variante" sx={{ alignSelf: "center" }}>
                    <ChevronRightRounded />
                </IconButton>
            )}
        </Box>
    );
}

export interface SaleVariantImagesProps {
    images: ProductsVariantImage[] | undefined;
    productName: string;
    variantDescription: string;
    onExpand: (src: string, alt: string) => void;
    /** Miniaturas secundarias (la principal usa vista grande). */
    secondaryThumbSize?: number;
}

const HERO_MIN_HEIGHT = 240;
const HERO_MAX_HEIGHT = 320;

/**
 * Vista principal grande + miniaturas con lupa (misma idea que crear/editar producto).
 */
export function SaleVariantImages({
    images,
    productName,
    variantDescription,
    onExpand,
    secondaryThumbSize = 108,
}: SaleVariantImagesProps) {
    const variantImages = sortVariantImages(images ?? []);

    if (variantImages.length === 0) {
        return (
            <Box
                sx={{
                    minHeight: HERO_MIN_HEIGHT,
                    borderRadius: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "action.hover",
                    px: 2,
                }}
            >
                <Typography variant="body2" color="text.disabled" textAlign="center">
                    Sin fotos para esta variante
                </Typography>
            </Box>
        );
    }

    const altBase = `${productName} — ${variantDescription}`;
    const [hero, ...others] = variantImages;
    const heroSrc = imgUrl(hero.url);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    minHeight: HERO_MIN_HEIGHT,
                    maxHeight: HERO_MAX_HEIGHT,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "2px solid",
                    borderColor: hero.isMain ? "primary.main" : "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1,
                }}
            >
                <Box
                    component="img"
                    src={heroSrc}
                    alt={altBase}
                    sx={{
                        maxWidth: "100%",
                        maxHeight: HERO_MAX_HEIGHT - 20,
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block",
                    }}
                />
                <Tooltip title="Ampliar">
                    <IconButton
                        size="medium"
                        onClick={() => onExpand(heroSrc, altBase)}
                        aria-label="Ampliar imagen principal"
                        sx={{
                            position: "absolute",
                            bottom: 10,
                            right: 10,
                            bgcolor: "rgba(0,0,0,0.55)",
                            color: "common.white",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                        }}
                    >
                        <ZoomInRoundedIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {others.length > 0 && (
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        Más fotos
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {others.map((img) => {
                            const src = imgUrl(img.url);
                            return (
                                <VariantImageThumb
                                    key={img.id}
                                    src={src}
                                    alt={altBase}
                                    size={secondaryThumbSize}
                                    isMain={img.isMain}
                                    emphasized={img.isMain}
                                    onExpand={() => onExpand(src, altBase)}
                                />
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
