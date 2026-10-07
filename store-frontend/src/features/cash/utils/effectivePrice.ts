import dayjs from "dayjs";
import { Product } from "@/features/products/types/productsTypes";
import { ProductsVariant } from "@/features/products/types/productsVariantTypes";

/**
 * Precio unitario efectivo del producto (sin variante).
 * Misma lógica que el backend: descuento del producto si está vigente.
 */
export function effectiveSalePrice(product: Product): number {
    return applyProductDiscount(product.salePrice, product);
}

/**
 * Precio unitario efectivo de una variante. Usa el override de la variante
 * cuando está definido; si no, hereda del producto. En ambos casos aplica
 * el descuento del producto si está vigente (mismo comportamiento que el backend).
 */
export function effectiveVariantSalePrice(product: Product, variant: ProductsVariant | null | undefined): number {
    const base = variant?.salePrice != null ? Number(variant.salePrice) : product.salePrice;
    return applyProductDiscount(base, product);
}

/** Precio de compra efectivo de la variante (override → producto). */
export function effectiveVariantPurchasePrice(product: Product, variant: ProductsVariant | null | undefined): number {
    return variant?.purchasePrice != null ? round2(Number(variant.purchasePrice)) : round2(product.purchasePrice);
}

function applyProductDiscount(basePrice: number, product: Product): number {
    const pct = product.discountPercentage;
    const start = product.discountStart;
    const end = product.discountEnd;
    if (pct == null || start == null || end == null) return round2(basePrice);
    const now = dayjs();
    if (now.isBefore(dayjs(start)) || now.isAfter(dayjs(end))) return round2(basePrice);
    return round2(basePrice * (1 - Number(pct) / 100));
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
