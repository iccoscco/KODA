import { ProductsVariant } from "./productsVariantTypes";

export interface Product {
    id: number;
    name: string;
    purchasePrice: number;
    salePrice: number;
    discountPercentage?: number | null;
    discountStart?: string | null;
    discountEnd?: string | null;
    isFeatured: boolean;
    totalSold: number;
    categoryId: number;
    categoryName: string;
    minStock: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    variants: ProductsVariant[];
}

export interface CreateProduct {
    name: string;
    purchasePrice: number;
    salePrice: number;
    categoryId: number;
    minStock: number;
}

export interface UpdateProduct {
    name: string;
    purchasePrice: number;
    salePrice: number;
    isFeatured: boolean;
    categoryId: number;
    minStock: number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Params {
    limit?: number;
    offset?: number;
    search?: string;
}

export interface StockMovement {
    id: number;
    productVariantId: number;
    variantLabel: string;
    quantity: number;
    type: "INPUT" | "OUTPUT";
    reason: string;
    userName: string;
    unitCost?: number;
    total?: number;
    createdAt: string;
}