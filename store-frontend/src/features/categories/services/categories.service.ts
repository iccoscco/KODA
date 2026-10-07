import { ApiService } from "@/shared/services/api.service";
import { Category, PaginatedResponse, Params, CreateCategory, UpdateCategory } from "../types/categoriesTypes";
import { Product } from "@/features/products/types/productsTypes";

export const CategoryService = {
    getCategories: async (params: Params): Promise<PaginatedResponse<Category>> => {
        const response = await ApiService.get<PaginatedResponse<Category>>("/categories", { params });
        return response.data;
    },
    getCategoryById: async (id: number): Promise<Category> => {
        const response = await ApiService.get<Category>(`/categories/${id}`);
        return response.data;
    },
    createCategory: async (category: CreateCategory): Promise<Category> => {
        const response = await ApiService.post<Category>("/categories", category);
        return response.data;
    },
    updateCategory: async (id: number, category: UpdateCategory): Promise<Category> => {
        const response = await ApiService.put<Category>(`/categories/${id}`, category);
        return response.data;
    },
    statusCategory: async (id: number, isActive: boolean): Promise<Category> => {
        const response = await ApiService.patch<Category>(`/categories/${id}/status`, { isActive });
        return response.data;
    },
    getAllCategories: async (): Promise<Category[]> => {
        const response = await ApiService.get<Category[]>("/categories");
        return response.data;
    },
    deleteCategory: async (id: number): Promise<void> => {
        await ApiService.delete(`/categories/${id}`);
    },
    getCategoryProducts: async (id: number): Promise<Product[]> => {
        const response = await ApiService.get<Product[]>(`/categories/${id}/products`);
        return response.data;
    },
}