import { ApiService } from "@/shared/services/api.service";
import { Color, CreateColor, UpdateColor } from "../types/colorsTypes";

export const ColorService = {
    getColors: async (): Promise<Color[]> => {
        const response = await ApiService.get<Color[]>("/colors");
        return response.data;
    },
    createColor: async (color: CreateColor): Promise<Color> => {
        const response = await ApiService.post<Color>("/colors", color);
        return response.data;
    },
    updateColor: async (id: number, color: UpdateColor): Promise<Color> => {
        const response = await ApiService.put<Color>(`/colors/${id}`, color);
        return response.data;
    }
}