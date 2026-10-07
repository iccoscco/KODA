import { ApiService } from "@/shared/services/api.service";
import type {
    DashboardSummary,
    SellerSalesItem,
    RegisterSalesItem,
    LowStockAlert,
    StockInputItem,
} from "../types/dashboardTypes";

export const DashboardService = {
    getSummary: async (): Promise<DashboardSummary> => {
        const res = await ApiService.get<DashboardSummary>("/dashboard/summary");
        return res.data;
    },

    getSalesBySeller: async (): Promise<SellerSalesItem[]> => {
        const res = await ApiService.get<SellerSalesItem[]>("/dashboard/sales-by-seller");
        return res.data;
    },

    getSalesByRegister: async (): Promise<RegisterSalesItem[]> => {
        const res = await ApiService.get<RegisterSalesItem[]>("/dashboard/sales-by-register");
        return res.data;
    },

    getLowStock: async (): Promise<LowStockAlert[]> => {
        const res = await ApiService.get<LowStockAlert[]>("/dashboard/low-stock");
        return res.data;
    },

    getStockInputs: async (): Promise<StockInputItem[]> => {
        const res = await ApiService.get<StockInputItem[]>("/dashboard/stock-inputs");
        return res.data;
    },
};
