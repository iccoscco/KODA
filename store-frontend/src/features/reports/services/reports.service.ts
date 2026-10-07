import { ApiService } from "@/shared/services/api.service";
import type {
    CashSessionReport,
    CashSessionFilters,
    PaginatedResponse,
    ProductReportRow,
    ProductFilters,
} from "../types/reportsTypes";

const cleanParams = (obj: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const ReportsService = {
    getCashSessions: async (
        filters: CashSessionFilters,
        pagination: { limit: number; offset: number },
    ): Promise<PaginatedResponse<CashSessionReport>> => {
        const res = await ApiService.get<PaginatedResponse<CashSessionReport>>("/reports/cash-sessions", {
            params: cleanParams({ ...filters, ...pagination } as Record<string, unknown>),
        });
        return res.data;
    },

    getProducts: async (
        filters: ProductFilters,
        pagination: { limit: number; offset: number },
    ): Promise<PaginatedResponse<ProductReportRow>> => {
        const res = await ApiService.get<PaginatedResponse<ProductReportRow>>("/reports/products", {
            params: cleanParams({ ...filters, ...pagination } as Record<string, unknown>),
        });
        return res.data;
    },

    exportCashSessionsPdf: async (filters: CashSessionFilters): Promise<void> => {
        const res = await ApiService.get<Blob>("/reports/cash-sessions/pdf", {
            params: cleanParams(filters as Record<string, unknown>),
            responseType: "blob",
        });
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },

    exportProductsPdf: async (filters: ProductFilters): Promise<void> => {
        const res = await ApiService.get<Blob>("/reports/products/pdf", {
            params: cleanParams(filters as Record<string, unknown>),
            responseType: "blob",
        });
        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },
};
