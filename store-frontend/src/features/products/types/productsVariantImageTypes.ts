export interface ProductsVariantImage {
    id: number;
    productId: number;
    url: string;
    isMain: boolean;
    createdAt: string;
}

export interface CreateProductsVariantImage {
    files: File[];
}