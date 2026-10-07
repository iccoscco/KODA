import { ApiService } from "@/shared/services/api.service";
import { User } from "@/features/users/types/usersTypes";
import { LoginRequest } from "@/features/auth/login/types";
import { RegisterRequest } from "@/features/auth/register/types";
import { useAuthStore } from "@/store/auth.store";

export interface AuthResponse {
    user: User;
}

export const AuthService = {
    login: async (request: LoginRequest): Promise<AuthResponse> => {
        const response = await ApiService.post<AuthResponse>("/auth/login", request);
        useAuthStore.getState().setSession(response.data.user);
        return response.data;
    },

    register: async (request: RegisterRequest): Promise<AuthResponse> => {
        const response = await ApiService.post<AuthResponse>("/auth/register", request);
        useAuthStore.getState().setSession(response.data.user);
        return response.data;
    },

    logout: async (): Promise<void> => {
        try {
            await ApiService.post<void>("/auth/logout");
        } finally {
            useAuthStore.getState().clearSession();
        }
    },

    refreshToken: async (): Promise<AuthResponse> => {
        const response = await ApiService.post<AuthResponse>("/auth/refresh-token", {});
        useAuthStore.getState().setSession(response.data.user);
        return response.data;
    },

    verifyToken: async (): Promise<User> => {
        const response = await ApiService.get<User>("/auth/me");
        const user = response.data;
        useAuthStore.getState().setSession(user);
        return user;
    },
};
