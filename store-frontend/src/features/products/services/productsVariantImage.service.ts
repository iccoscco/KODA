import { ApiService } from "@/shared/services/api.service";
import { ProductsVariantImage } from "../types/productsVariantImageTypes";

export const ProductsVariantImageService = {
    createProductsVariantImage: async (variantId: number, files: File[]): Promise<ProductsVariantImage[]> => {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        const response = await ApiService.post<ProductsVariantImage[]>(`/product-variants/${variantId}/images`, formData);
        return response.data;
    },

    deleteProductsVariantImage: async (id: number): Promise<void> => {
        const response = await ApiService.delete<void>(`/product-variants/images/${id}`);
        return response.data;
    },

    /** Marca la imagen como principal de su variante (resto deja de ser principal). */
    setMainProductVariantImage: async (imageId: number): Promise<void> => {
        await ApiService.patch(`/product-variants/images/${imageId}/main`);
    },
};
