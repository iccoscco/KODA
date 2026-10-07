import { ApiService } from "@/shared/services/api.service";
import { ProductsVariant, CreateProductsVariant, UpdateProductsVariant } from "../types/productsVariantTypes";

export const ProductsVariantService = {
    getProductsVariantsByProductId: async (productId: number): Promise<ProductsVariant[]> => {
        const response = await ApiService.get<ProductsVariant[]>(`/product-variants/product/${productId}`);
        return response.data;
    },
    getProductsVariantById: async (id: number): Promise<ProductsVariant> => {
        const response = await ApiService.get<ProductsVariant>(`/product-variants/${id}`);
        return response.data;
    },
    createProductsVariant: async (productsVariant: CreateProductsVariant): Promise<ProductsVariant> => {
        const response = await ApiService.post<ProductsVariant>("/product-variants", productsVariant);
        return response.data;
    },
    updateProductsVariant: async (id: number, productsVariant: UpdateProductsVariant): Promise<ProductsVariant> => {
        const response = await ApiService.put<ProductsVariant>(`/product-variants/${id}`, productsVariant);
        return response.data;
    },
    /** Desactiva la variante en el servidor (soft delete). */
    deleteProductsVariant: async (id: number): Promise<void> => {
        await ApiService.delete(`/product-variants/${id}`);
    },
}