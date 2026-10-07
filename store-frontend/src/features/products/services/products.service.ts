import { ApiService } from "@/shared/services/api.service";
import { Product, PaginatedResponse, Params, CreateProduct, UpdateProduct, StockMovement } from "../types/productsTypes";

export const ProductService = {
    getProducts: async (params: Params): Promise<PaginatedResponse<Product>> => {
        const response = await ApiService.get<PaginatedResponse<Product>>("/products", { params });
        return response.data;
    },
    getProduct: async (id: number): Promise<Product> => {
        const response = await ApiService.get<Product>(`/products/${id}`);
        return response.data;
    },
    createProduct: async (product: CreateProduct): Promise<Product> => {
        const response = await ApiService.post<Product>("/products", product);
        return response.data;
    },
    updateProduct: async (id: number, product: UpdateProduct): Promise<Product> => {
        const response = await ApiService.put<Product>(`/products/${id}`, product);
        return response.data;
    },
    statusProduct: async (id: number, isActive: boolean): Promise<Product> => {
        const response = await ApiService.patch<Product>(`/products/${id}/status`, { isActive });
        return response.data;
    },
    deleteProduct: async (id: number): Promise<void> => {
        await ApiService.delete(`/products/${id}`);
    },
    getStockMovements: async (id: number): Promise<StockMovement[]> => {
        const response = await ApiService.get<StockMovement[]>(`/products/${id}/stock-movements`);
        return response.data;
    },
}