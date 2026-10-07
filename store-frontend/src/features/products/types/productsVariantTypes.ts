import { ProductsVariantImage } from "./productsVariantImageTypes";

export interface ProductsVariant {
    id: number;
    productId: number;
    productName: string;
    colorId?: number;
    colorName?: string;
    colorHexCode?: string;
    sizeId?: number;
    sizeName?: string;
    stock: number;
    minStock: number;
    sku?: string | null;
    /**
     * Precio de venta específico de esta variante.
     * `null` = hereda del producto padre.
     */
    salePrice?: number | null;
    /**
     * Precio de compra específico de esta variante.
     * `null` = hereda del producto padre.
     */
    purchasePrice?: number | null;
    isActive: boolean;
    images: ProductsVariantImage[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductsVariant {
    productId: number;
    colorId?: number;
    sizeId?: number;
    stock: number;
    minStock?: number;
    /** Opcional: el cliente puede crear variantes sin SKU. */
    sku?: string;
    /** Opcional. Si se omite, la variante hereda el precio del producto. */
    salePrice?: number | null;
    /** Opcional. Si se omite, la variante hereda el precio de compra del producto. */
    purchasePrice?: number | null;
}

export interface UpdateProductsVariant {
    colorId?: number | null;
    sizeId?: number | null;
    stock: number;
    minStock?: number;
    /** Opcional. Si se omite se mantiene el SKU actual. */
    sku?: string;
    /** `null` borra el override y vuelve a heredar del producto. */
    salePrice?: number | null;
    /** `null` borra el override y vuelve a heredar del producto. */
    purchasePrice?: number | null;
}