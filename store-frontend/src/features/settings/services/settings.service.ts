import { ApiService } from "@/shared/services/api.service";
import { User } from "@/features/users/types/usersTypes";
import type { StoreConfig, StoreConfigUpdate } from "../types/settingsTypes";

export interface UpdateProfileRequest {
    name: string;
    email: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export const SettingsService = {
    updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
        const response = await ApiService.put<User>("/users/profile", data);
        return response.data;
    },

    uploadAvatar: async (file: File): Promise<User> => {
        const formData = new FormData();
        formData.append("file", file);
        // ApiService.post detects FormData and sets multipart/form-data automatically
        const response = await ApiService.post<User>("/users/profile/avatar", formData);
        return response.data;
    },

    deleteAvatar: async (): Promise<User> => {
        const response = await ApiService.delete<User>("/users/profile/avatar");
        return response.data;
    },

    changePassword: async (data: ChangePasswordRequest): Promise<void> => {
        await ApiService.post("/users/profile/change-password", data);
    },

    getStoreConfig: async (): Promise<StoreConfig> => {
        const res = await ApiService.get<StoreConfig>("/store-config");
        return res.data;
    },

    updateStoreConfig: async (data: StoreConfigUpdate): Promise<StoreConfig> => {
        const res = await ApiService.put<StoreConfig>("/store-config", data);
        return res.data;
    },

    uploadLogo: async (file: File): Promise<StoreConfig> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await ApiService.post<StoreConfig>("/store-config/logo", formData);
        return res.data;
    },

    deleteLogo: async (): Promise<StoreConfig> => {
        const res = await ApiService.delete<StoreConfig>("/store-config/logo");
        return res.data;
    },

    testPrinterConnection: async (printerIp: string, printerPort: number): Promise<void> => {
        await ApiService.post("/store-config/printer/test", { printerIp, printerPort });
    },
};
