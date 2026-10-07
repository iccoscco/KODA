import { ApiService } from "@/shared/services/api.service";
import { Role, PaginatedResponse, Params, RoleCreate, RoleUpdate, Permission } from "../types/rolesTypes";

export const RoleService = {
    getRoles: async (params: Params): Promise<PaginatedResponse<Role>> => {
        const response = await ApiService.get<PaginatedResponse<Role>>("/roles", { params });
        return response.data;
    },
    getRole: async (id: number): Promise<Role> => {
        const response = await ApiService.get<Role>(`/roles/${id}`);
        return response.data;
    },
    createRole: async (role: RoleCreate): Promise<Role> => {
        const response = await ApiService.post<Role>("/roles", role);
        return response.data;
    },
    updateRole: async (id: number, role: RoleUpdate): Promise<Role> => {
        const response = await ApiService.put<Role>(`/roles/${id}`, role);
        return response.data;
    },
    getPermissions: async (params: Params): Promise<PaginatedResponse<Permission>> => {
        const response = await ApiService.get<PaginatedResponse<Permission>>("/roles/permissions", { params });
        return response.data;
    },
    getAllPermissions: async (search?: string): Promise<Permission[]> => {
        const response = await ApiService.get<Permission[]>("/roles/permissions",
            search ? { params: { search } } : undefined);
        return response.data;
    },
    getAllRoles: async (): Promise<Role[]> => {
        const response = await ApiService.get<Role[]>("/roles");
        return response.data;
    },
    statusRole: async (id: number, isActive: boolean): Promise<Role> => {
        const response = await ApiService.patch<Role>(`/roles/${id}/status`, { isActive });
        return response.data;
    },
    deleteRole: async (id: number): Promise<void> => {
        await ApiService.delete(`/roles/${id}`);
    },
};