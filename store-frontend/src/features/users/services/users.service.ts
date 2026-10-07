import { ApiService } from "@/shared/services/api.service";
import { User, PaginatedResponse, Params, UserCreate, UserUpdate } from "../types/usersTypes";

export const UserService = {
    getUsers: async (params: Params): Promise<PaginatedResponse<User>> => {
        const response = await ApiService.get<PaginatedResponse<User>>("/users", { params });
        return response.data;
    },
    getUser: async (id: number): Promise<User> => {
        const response = await ApiService.get<User>(`/users/${id}`);
        return response.data;
    },
    createUser: async (user: UserCreate): Promise<User> => {
        const response = await ApiService.post<User>("/users", user);
        return response.data;
    },
    updateUser: async (id: number, user: UserUpdate): Promise<User> => {
        const response = await ApiService.put<User>(`/users/${id}`, user);
        return response.data;
    },
    statusUser: async (id: number, isActive: boolean): Promise<User> => {
        const response = await ApiService.patch<User>(`/users/${id}/status`, { isActive });
        return response.data;
    },
    deleteUser: async (id: number): Promise<void> => {
        await ApiService.delete(`/users/${id}`);
    },
    adminChangePassword: async (id: number, newPassword: string): Promise<void> => {
        await ApiService.patch(`/users/${id}/password`, { newPassword });
    },
}