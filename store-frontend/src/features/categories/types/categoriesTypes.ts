export interface Category {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    /** Cantidad de productos en la categoría (viene del API como productCount). */
    productCount: number;
    /** Total de variantes de todos los productos de la categoría. */
    variantCount: number;
    /** Suma del stock de todas esas variantes (unidades). */
    totalStock: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCategory {
    name: string;
    description: string;
}

export interface UpdateCategory {
    name: string;
    description: string;
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