import { ApiService } from "@/shared/services/api.service";
import { Size, CreateSize, UpdateSize } from "../types/sizesTypes";

export const SizeService = {
    getSizes: async (): Promise<Size[]> => {
        const response = await ApiService.get<Size[]>("/sizes");
        return response.data;
    },
    createSize: async (size: CreateSize): Promise<Size> => {
        const response = await ApiService.post<Size>("/sizes", size);
        return response.data;
    },
    updateSize: async (id: number, size: UpdateSize): Promise<Size> => {
        const response = await ApiService.put<Size>(`/sizes/${id}`, size);
        return response.data;
    }
}