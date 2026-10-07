import { ApiService } from "@/shared/services/api.service";
import type { Sale, CreateSale, OrderStatusUpdate } from "../types/salesTypes";

export const SaleService = {
    getSaleById: async (id: number): Promise<Sale> => {
        const response = await ApiService.get<Sale>(`/orders/${id}`);
        return response.data;
    },
    createSale: async (sale: CreateSale): Promise<Sale> => {
        const response = await ApiService.post<Sale>("/orders", sale);
        return response.data;
    },
    updateSaleStatus: async (id: number, body: OrderStatusUpdate): Promise<Sale> => {
        const response = await ApiService.put<Sale>(`/orders/${id}/status`, body);
        return response.data;
    },
    cancelSale: async (id: number): Promise<void> => {
        await ApiService.put<{ message: string }>(`/orders/${id}/cancel`);
    },
};
