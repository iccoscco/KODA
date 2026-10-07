export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface CashSessionReport {
    id: number;
    cashRegisterId: number | null;
    cashRegisterName: string;
    initialAmount: number;
    closingAmount: number | null;
    systemBalance: number | null;
    difference: number | null;
    openedAt: string;
    closedAt: string | null;
    isActive: boolean;
}

export interface ProductReportRow {
    id: number;
    name: string;
    categoryName: string;
    /** Precio base del producto. Ver minVariantPrice/maxVariantPrice para el rango efectivo con variantes. */
    salePrice: number;
    /** Precio mínimo efectivo considerando overrides de variantes activas. */
    minVariantPrice: number | null;
    /** Precio máximo efectivo considerando overrides de variantes activas. */
    maxVariantPrice: number | null;
    variantCount: number;
    totalStock: number;
    isActive: boolean;
}

export interface CashSessionFilters {
    cashRegisterId?: number | "";
    startDate?: string;
    endDate?: string;
    status?: string;
}

export interface ProductFilters {
    categoryId?: number | "";
    status?: string;
    stockFilter?: string;
}
